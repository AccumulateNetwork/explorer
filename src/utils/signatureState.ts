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
 * - `invalidated` — the entry did vote, and the executor has since thrown that
 *   vote away: a signature at a higher signer version replaced the active set.
 *   The signature is still in the response, and is worth nothing.
 * - `none` — nothing has arrived.
 */
export type EntryState =
  | { kind: 'voted'; vote: string; via: string }
  | { kind: 'signed'; page: string; have: number; need: number }
  | {
      kind: 'invalidated';
      via: string;
      /** The page version the signature was made against, where it is known. */
      signedVersion?: number;
      /** A fresh signature already accumulating on the delegate's own page. */
      progress?: { page: string; have: number; need: number };
    }
  | { kind: 'none' };

export interface AuthorityEntry {
  /** Delegate book, or a short key label when the entry is a bare key. */
  label: string;
  state: EntryState;
}

export interface SignatureState {
  /** The page whose accept threshold governs the transaction. */
  page: string;
  /** The page's version *now* — what a live signature must be made against. */
  version?: number;
  threshold: number;
  /** Entries satisfied — the numerator the header should show. */
  votes: number;
  /** Entries whose vote a higher-version signature discarded. */
  invalidated: number;
  entries: AuthorityEntry[];
}

export interface SignatureStateOptions {
  /**
   * Whether the transaction is still pending. It decides whether the node's
   * `historical` flag means anything: see {@link computeSignatureState}.
   */
  pending?: boolean;
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
 * The node marks a signature `historical` when it is not in the account's
 * active set — the very set the executor tallies (`SignerWillVote`). This is
 * the chain's own verdict, and the only one worth asking: a signature is
 * dropped from that set when a signature at a higher signer version replaces
 * it, not when the page is edited.
 *
 * This is only a statement about *invalidity* while the transaction is
 * pending. Once it executes, the active set is cleared and every signature on
 * it is historical — including the ones that carried it (#76).
 */
const isActive = (r: SigRecord) => !r.historical;

/** The version a key signature was made against, when it carries one. */
function versionOf(signature: core.Signature): number | undefined {
  let s: core.Signature = signature;
  while (s instanceof core.DelegatedSignature && s.signature) {
    s = s.signature;
  }
  return 'signerVersion' in s ? s.signerVersion : undefined;
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
 * A vote is also not permanent. When a signature arrives at a *higher* signer
 * version than the active set holds, `addSignature` REPLACES the set rather
 * than joining it, and every signature already on it is discarded. Those
 * signatures stay in the response, flagged `historical`; counting them
 * reported a stalled distribution as ready to execute (#81). Pass `pending` so
 * they can be told apart from the historical signatures of a transaction that
 * has already executed.
 *
 * Note what does NOT invalidate a signature: editing the page. Bumping the
 * version unmakes nothing on its own — the set is replaced only by a signature
 * at the higher version, so a signature made against an older version keeps
 * counting until then. Deciding this by comparing versions gets it backwards
 * in the dangerous direction, calling live votes dead; the staking signer
 * measured a real 3-of-4 lost that way (core/staking!481, and see
 * `heldSignature` in its cmd/asp/signpath.go). The chain publishes its own
 * verdict as `historical`, which is the only test used here — `signedVersion`
 * is carried for the operator-facing explanation and never for the decision.
 *
 * Returns null when there is no governing page to reason about (a single
 * signer, an anchor, a synthetic message), leaving the caller to fall back.
 */
export function computeSignatureState(
  sets: readonly SignatureSetRecord[] = [],
  { pending = false }: SignatureStateOptions = {},
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
  const version = 'version' in account ? account.version : undefined;

  // Only signatures the executor still counts. On a pending transaction the
  // rest have been discarded; on an executed one they are all flagged and the
  // distinction is meaningless, so keep them.
  const counted = (records: SigRecord[]) =>
    pending ? records.filter(isActive) : records;

  // Votes: authority signatures that landed on this page. The chain's first
  // element is where a signature arrived, so a nested delegate's vote (which
  // landed on an intermediate page) is not counted again here — attributing by
  // the `authority` field alone would double-count it.
  const isPageVote = (x: SigRecord): x is SigRecord<core.AuthoritySignature> =>
    x.message.signature instanceof core.AuthoritySignature &&
    sameUrl(x.message.signature.delegator?.[0], pageUrl);

  const pageSigs = counted(signaturesOf(pageSet));
  const deadSigs = signaturesOf(pageSet).filter((x) => !pageSigs.includes(x));

  const votesOf = (records: SigRecord[]) =>
    records.filter(isPageVote).map((x) => x.message.signature);
  const votes = votesOf(pageSigs);
  const deadVotes = votesOf(deadSigs);

  // Sidecar: a key on the page signing it directly satisfies its own entry.
  const keyHashes = (records: SigRecord[]) =>
    new Map(
      records
        .map((x) => x.message.signature)
        .filter((x) => 'publicKey' in x && x.publicKey)
        .map((x) => [
          hex(sha256((x as core.KeySignature).publicKey)),
          versionOf(x),
        ]),
    );
  const directKeys = keyHashes(pageSigs);
  // A key that has also signed at the current version is not invalidated: the
  // live signature is the one that counts.
  const deadKeys = new Map(
    [...keyHashes(deadSigs)].filter(([k]) => !directKeys.has(k)),
  );

  /** A fresh signature accumulating on the delegate's own page, if any. */
  const progressOf = (delegate: URL) => {
    const book = `${delegate}`.toLowerCase();
    const set = sets.find(
      (s) =>
        s.account?.url &&
        bookOf(`${s.account.url}`) === book &&
        counted(signaturesOf(s)).length > 0,
    );
    if (!set) return undefined;
    const acct = set.account;
    return {
      page: `${acct.url}`,
      have: counted(signaturesOf(set)).length,
      need: ('acceptThreshold' in acct && acct.acceptThreshold) || 1,
    };
  };

  const matched = new Set<string>();
  const entries: AuthorityEntry[] = account.keys.map((entry) => {
    const label = entry.delegate
      ? `${entry.delegate}`
      : `key ${hex(entry.publicKeyHash || new Uint8Array()).slice(0, 8)}…`;
    const keyHash = entry.publicKeyHash && hex(entry.publicKeyHash);

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

    if (keyHash && directKeys.has(keyHash)) {
      matched.add(keyHash);
      return {
        label,
        state: { kind: 'voted', vote: 'accept', via: 'a key on this page' },
      };
    }

    // The entry did vote and the executor threw that vote away. Say so before
    // anything else: to the signer it looks like they have already signed.
    const dead = deadVotes.find((v) => sameUrl(v.authority, entry.delegate));
    if (dead || (keyHash && deadKeys.has(keyHash))) {
      if (keyHash && deadKeys.has(keyHash)) matched.add(keyHash);
      return {
        label,
        state: {
          kind: 'invalidated',
          via: dead ? `${dead.origin ?? dead.authority}` : 'a key on this page',
          signedVersion: dead ? undefined : deadKeys.get(keyHash),
          progress: entry.delegate ? progressOf(entry.delegate) : undefined,
        },
      };
    }

    // Nothing counted yet — is the delegate's own page part-way there?
    if (entry.delegate) {
      const progress = progressOf(entry.delegate);
      if (progress) {
        return { label, state: { kind: 'signed', ...progress } };
      }
    }

    return { label, state: { kind: 'none' } };
  });

  // A key signature the protocol accepted satisfied an entry when it was made,
  // but the page carried here is its state *now*: an executed transaction may
  // have been signed by a key since rotated out (the account query returns no
  // history). Count those votes rather than under-report a transaction that
  // plainly executed, and say why they no longer line up.
  for (const [keyHash, signedVersion] of [...directKeys, ...deadKeys]) {
    if (matched.has(keyHash)) continue;
    const via = 'a key that is no longer an entry on this page';
    entries.push({
      label: `key ${keyHash.slice(0, 8)}…`,
      state: directKeys.has(keyHash)
        ? { kind: 'voted', vote: 'accept', via }
        : { kind: 'invalidated', via, signedVersion },
    });
  }

  return {
    page: `${account.url}`,
    version,
    threshold,
    votes: entries.filter((x) => x.state.kind === 'voted').length,
    invalidated: entries.filter((x) => x.state.kind === 'invalidated').length,
    entries,
  };
}
