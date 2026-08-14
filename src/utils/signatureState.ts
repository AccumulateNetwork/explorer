import { URL, core, messaging } from 'accumulate.js';
import { SignatureSetRecord } from 'accumulate.js/lib/api_v3';
import { sha256 } from 'accumulate.js/lib/common';

import { SigRecord, isRecordOf } from './types';

/**
 * What the executor makes of one entry on the authority page.
 *
 * - `voted` — the entry is satisfied. Either its delegate delivered an
 *   authority signature to the page, or a key matching the entry signed the
 *   page directly (the "sidecar" shape). These are the only things the accept
 *   threshold counts.
 * - `signed` — key signatures are accumulating on the delegate's own page but
 *   that page has not reached *its* threshold, so it has emitted nothing. The
 *   signatures are recorded and paid for and count for nothing yet; if the
 *   page can never reach its threshold they are stranded permanently.
 * - `none` — nothing has arrived.
 */
export type EntryState =
  | { kind: 'voted'; vote: string; via: string }
  | { kind: 'signed'; page: string; have: number; need: number }
  | { kind: 'none' };

export interface AuthorityEntry {
  /** Delegate book, or a short key label when the entry is a bare key. */
  label: string;
  state: EntryState;
}

export interface SignatureState {
  /** The page whose accept threshold governs the transaction. */
  page: string;
  threshold: number;
  /** Entries satisfied — the numerator the header should show. */
  votes: number;
  entries: AuthorityEntry[];
}

const hex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** Page URLs are `<book>/<n>`; the book is what a delegate entry names. */
const bookOf = (page: string) => page.replace(/\/\d+$/, '').toLowerCase();

const sameUrl = (a?: URL | string, b?: URL | string) =>
  !!a && !!b && `${a}`.toLowerCase() === `${b}`.toLowerCase();

function signaturesOf(set: SignatureSetRecord): SigRecord[] {
  return (set.signatures?.records || []).filter((x): x is SigRecord =>
    isRecordOf(x, messaging.SignatureMessage),
  );
}

/**
 * Where a signature is ultimately bound. An authority signature carries the
 * full chain (innermost page first, the governing page last); a delegated key
 * signature carries the governing page directly.
 */
function destinationOf(signature: core.Signature): string | undefined {
  if (signature instanceof core.AuthoritySignature) {
    const chain = signature.delegator || [];
    return chain.length ? `${chain[chain.length - 1]}` : undefined;
  }
  if (signature instanceof core.DelegatedSignature) {
    return signature.delegator ? `${signature.delegator}` : undefined;
  }
  return undefined;
}

/**
 * Resolve what a multisig transaction is actually waiting on.
 *
 * The page reported a flat count of key-signature messages, which is not what
 * the executor evaluates: only authority signatures delivered *to* the
 * governing page are votes, and the old count excluded exactly those (#75).
 * Signatures still accumulating on a delegate's own page, or stuck below its
 * threshold, look identical in that total — so a stalled transaction read as
 * complete (#76).
 *
 * Returns null when there is no governing page to reason about (a single
 * signer, an anchor, a synthetic message), leaving the caller to fall back.
 */
export function computeSignatureState(
  sets: readonly SignatureSetRecord[] = [],
): SignatureState | null {
  if (!sets?.length) return null;

  // The governing page is where every signature is ultimately bound.
  const tally = new Map<string, number>();
  for (const set of sets) {
    for (const rec of signaturesOf(set)) {
      const dest = destinationOf(rec.message.signature);
      if (dest) tally.set(dest, (tally.get(dest) || 0) + 1);
    }
  }
  const pageUrl = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!pageUrl) return null;

  const pageSet = sets.find((s) => sameUrl(s.account?.url, pageUrl));
  const account = pageSet?.account;
  if (!account || !('keys' in account) || !account.keys?.length) return null;

  const threshold =
    ('acceptThreshold' in account && account.acceptThreshold) || 1;

  // Votes: authority signatures that landed on this page. The chain's first
  // element is where a signature arrived, so a nested delegate's vote (which
  // landed on an intermediate page) is not counted again here — attributing by
  // the `authority` field alone would double-count it.
  const votes = signaturesOf(pageSet)
    .map((x) => x.message.signature)
    .filter(
      (x): x is core.AuthoritySignature =>
        x instanceof core.AuthoritySignature &&
        sameUrl(x.delegator?.[0], pageUrl),
    );

  // Sidecar: a key on the page signing it directly satisfies its own entry.
  const directKeys = new Set(
    signaturesOf(pageSet)
      .map((x) => x.message.signature)
      .filter((x) => 'publicKey' in x && x.publicKey)
      .map((x) => hex(sha256((x as core.KeySignature).publicKey))),
  );

  const matched = new Set<string>();
  const entries: AuthorityEntry[] = account.keys.map((entry) => {
    const label = entry.delegate
      ? `${entry.delegate}`
      : `key ${hex(entry.publicKeyHash || new Uint8Array()).slice(0, 8)}…`;

    const vote = votes.find((v) => sameUrl(v.authority, entry.delegate));
    if (vote) {
      return {
        label,
        state: {
          kind: 'voted',
          vote: `${vote.vote ?? 'accept'}`,
          via: `${vote.origin ?? vote.authority}`,
        },
      };
    }

    if (entry.publicKeyHash && directKeys.has(hex(entry.publicKeyHash))) {
      matched.add(hex(entry.publicKeyHash));
      return {
        label,
        state: { kind: 'voted', vote: 'accept', via: 'a key on this page' },
      };
    }

    // Nothing counted yet — is the delegate's own page part-way there?
    if (entry.delegate) {
      const book = `${entry.delegate}`.toLowerCase();
      const pending = sets.find(
        (s) =>
          s.account?.url &&
          bookOf(`${s.account.url}`) === book &&
          signaturesOf(s).length > 0,
      );
      if (pending) {
        const acct = pending.account;
        return {
          label,
          state: {
            kind: 'signed',
            page: `${acct.url}`,
            have: signaturesOf(pending).length,
            need: ('acceptThreshold' in acct && acct.acceptThreshold) || 1,
          },
        };
      }
    }

    return { label, state: { kind: 'none' } };
  });

  // A key signature the protocol accepted satisfied an entry when it was made,
  // but the page carried here is its state *now*: an executed transaction may
  // have been signed by a key since rotated out (the account query returns no
  // history). Count those votes rather than under-report a transaction that
  // plainly executed, and say why they no longer line up.
  for (const keyHash of directKeys) {
    if (matched.has(keyHash)) continue;
    entries.push({
      label: `key ${keyHash.slice(0, 8)}…`,
      state: {
        kind: 'voted',
        vote: 'accept',
        via: 'a key that is no longer an entry on this page',
      },
    });
  }

  return {
    page: `${account.url}`,
    threshold,
    votes: entries.filter((x) => x.state.kind === 'voted').length,
    entries,
  };
}
