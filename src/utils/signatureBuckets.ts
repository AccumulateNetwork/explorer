import { URL, core, messaging } from 'accumulate.js';
import { SignatureSetRecord } from 'accumulate.js/lib/api_v3';
import { sha256 } from 'accumulate.js/lib/common';
import { VoteType } from 'accumulate.js/lib/core';

import { SigRecord, isRecordOf } from './types';

/**
 * The authority a raw signature record is filed under: the book at the end of
 * a delegation, the authority an authority signature speaks for, or the book
 * owning the page a key signed.
 */
export function signatureAuthority(signature: core.Signature): URL | undefined {
  if (signature instanceof core.DelegatedSignature) {
    return signature.delegator
      ? URL.parse(`${signature.delegator}`.replace(/\/\d+$/, ''))
      : undefined;
  }
  if (signature instanceof core.AuthoritySignature) {
    return signature.authority;
  }
  if ('publicKey' in signature && signature.signer) {
    return URL.parse(`${signature.signer}`.replace(/\/\d+$/, ''));
  }
  return undefined;
}

/**
 * The vote a record carries. Delegation wraps the key signature that holds it,
 * so reading `vote` off the outer signature finds nothing; walk in first.
 */
export function voteOf(signature: core.Signature): VoteType {
  let s: core.Signature = signature;
  while (s instanceof core.DelegatedSignature && s.signature) {
    s = s.signature;
  }
  return 'vote' in s && s.vote != null ? s.vote : VoteType.Accept;
}

/** Whether a vote blocks the transaction. The executor asks it this way. */
export const isRejection = (vote: VoteType) => vote !== VoteType.Accept;

export type AuthorityKind = 'required' | 'disabled' | 'other';

export interface AuthorityGroup {
  authority: URL;
  /**
   * `required` and `disabled` are authorities of the principal; `other` is a
   * book that signed without being one.
   */
  kind: AuthorityKind;
  /** Live records voting accept. */
  signatures: SigRecord[];
  /**
   * Live records voting anything else. `checkAuth` counts any vote that is not
   * accept as a reject, so an abstain blocks exactly as a rejection does and
   * belongs with them — tagged, so the list says which it was.
   */
  rejections: SigRecord[];
  /**
   * Records that do not count, whatever they voted. A rejection lands here
   * too: a signer who rejects and then signs again leaves the rejection
   * behind. While pending this is the chain's own answer; on a completed
   * transaction the chain has none, so it is what the rules show was
   * superseded (#86).
   */
  historical: SigRecord[];
}

export interface RequiredAuthority {
  url: URL;
  disabled?: boolean;
}

const hex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** The innermost key signature, where the version, key and timestamp live. */
function innermost(signature: core.Signature): core.Signature {
  let s: core.Signature = signature;
  while (s instanceof core.DelegatedSignature && s.signature) {
    s = s.signature;
  }
  return s;
}

/**
 * The records this table lists: user signatures only — delegated, or carrying
 * a key. An authority signature is the authority's *vote*, which drives a
 * row's status rather than appearing as a record in it.
 */
export function listedSignatures(
  sets: readonly SignatureSetRecord[] = [],
): SigRecord[] {
  const out: SigRecord[] = [];
  for (const set of sets) {
    for (const sig of set.signatures?.records || []) {
      if (!isRecordOf(sig, messaging.SignatureMessage)) continue;
      if (
        sig.message.signature instanceof core.DelegatedSignature ||
        'publicKey' in sig.message.signature
      ) {
        out.push(sig as SigRecord);
      }
    }
  }
  return out;
}

/** Why a record is not counted, where the executor's rules say so. */
export type OutOfSetReason = 'replaced' | 'overridden' | 'unknown';

export interface RecordStatus {
  /** Whether this record counts toward its signer's threshold. */
  counted: boolean;
  /** Set when `counted` is false. */
  reason?: OutOfSetReason;
  /** The record that overrode this one, when the reason is `overridden`. */
  supersededBy?: SigRecord;
  /** The signer version it was made against, when it carries one. */
  version?: number;
  /** Its key is no longer an entry on the page it signed. */
  keyRemoved: boolean;
}

/**
 * Replay the executor's rules over the records themselves.
 *
 * `historical` answers whether a record is in the active set, which is all the
 * protocol reports and all we ask of it while a transaction is pending. But
 * the flag inverts on a completed transaction: the active set is cleared on
 * execution, so every record carries it and it separates nothing — the very
 * question the table needs answered (#86).
 *
 * The signatures carry enough to reconstruct it, because two rules decide
 * membership and both are visible:
 *
 * - **replaced.** `addSignature` replaces a signer's active set when a
 *   signature at a HIGHER signer version arrives. So within one account's
 *   records the highest `signerVersion` present is the live cohort, and
 *   anything below it was replaced. Note what this is not: a comparison
 *   against the page's *current* version, which calls live votes dead and
 *   cost staking a real 3-of-4 (#81). The cohort is read from the records.
 * - **overridden.** Entries are keyed by KeyIndex+Path and `Set.Add` writes
 *   over an equal slot, so a later signature from the same key at the same
 *   version overwrites the earlier one — how an accept becomes a rejection.
 *
 * Measured across every fixture here, the replacement rule never reports a
 * replacement for a record the chain still held. Where it disagrees with
 * `historical`, the record left the active set for a reason that is not a
 * violation — consumed upward, or cleared on execution — which is exactly the
 * distinction the flag cannot express. `signatureRulesAreSound` in the tests
 * pins that asymmetry.
 */
export function classifySignatures(
  sets: readonly SignatureSetRecord[] = [],
  { pending = false }: { pending?: boolean } = {},
): Map<string, RecordStatus> {
  const status = new Map<string, RecordStatus>();

  for (const set of sets) {
    const account = set.account;
    const onPage = new Set(
      (account && 'keys' in account ? account.keys || [] : [])
        .map((k) => k.publicKeyHash && hex(k.publicKeyHash))
        .filter(Boolean),
    );

    const records = listedSignatures([set]).map((record) => {
      const sig = innermost(record.message.signature);
      const key =
        'publicKey' in sig && sig.publicKey
          ? hex(sha256(sig.publicKey))
          : undefined;
      return {
        record,
        key,
        version: 'signerVersion' in sig ? sig.signerVersion : undefined,
        timestamp: ('timestamp' in sig && sig.timestamp) || 0,
      };
    });

    const versions = records
      .map((x) => x.version)
      .filter((x): x is number => x != null);
    const live = versions.length ? Math.max(...versions) : undefined;

    for (const x of records) {
      const replaced = x.version != null && live != null && x.version < live;

      // Only ever compared within one key at one version, so the two
      // timestamp scales in use (milli- and microseconds) never meet.
      const superseding = records.find(
        (y) =>
          y !== x &&
          y.key &&
          y.key === x.key &&
          y.version === x.version &&
          y.timestamp > x.timestamp,
      );

      const counted = pending
        ? !x.record.historical
        : !replaced && !superseding;

      status.set(`${x.record.id}`, {
        counted,
        reason: counted
          ? undefined
          : replaced
            ? 'replaced'
            : superseding
              ? 'overridden'
              : 'unknown',
        supersededBy: superseding?.record,
        version: x.version,
        keyRemoved: !!key0(onPage, x.key),
      });
    }
  }

  return status;
}

/** True when the page has a key list and this key is not on it. */
function key0(onPage: Set<string>, key?: string) {
  return key && onPage.size > 0 && !onPage.has(key);
}

/** The account a record was recorded on, when its own signature names nobody. */
function fallbackAuthority(record: SigRecord): URL | undefined {
  const account = record.id?.account;
  return account ? URL.parse(`${account}`.replace(/\/\d+$/, '')) : undefined;
}

/**
 * Group signature records by the authority they belong to, and within each
 * authority by what the chain currently makes of them.
 *
 * Membership of the active set is decided by the protocol, not here: the
 * executor maintains each account's Votes/Payments/Signatures collections and
 * reads that same set in `SignerWillVote`, and the API reports the difference
 * from the history chain as `historical` (`internal/api/v3/load.go`). A record
 * leaves the active set when the key book changes under it — the page is
 * modified, a key removed, and a signature at the new version replaces the set
 * — or when the signer votes again, overwriting its earlier entry. Either way
 * it stops counting, which is the only claim made here (#83).
 *
 * `pending` selects which answer is available, not how hard we look. While
 * pending, the chain reports membership and we take it. Once executed the
 * active set is cleared and every record carries the flag, so membership is
 * reconstructed from the rules instead — see {@link classifySignatures}.
 */
export function groupSignatures(
  sets: readonly SignatureSetRecord[],
  authorities: readonly RequiredAuthority[],
  { pending = false }: { pending?: boolean } = {},
): { groups: AuthorityGroup[]; status: Map<string, RecordStatus> } {
  const status = classifySignatures(sets, { pending });
  const signatures = listedSignatures(sets);
  const groups = new Map<string, AuthorityGroup>();
  const make = (authority: URL, kind: AuthorityKind) => {
    const key = `${authority}`.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = {
        authority,
        kind,
        signatures: [],
        rejections: [],
        historical: [],
      };
      groups.set(key, group);
    }
    return group;
  };

  // Seeded first, and in the account's own order, so an authority with no
  // signatures still gets a row — which is what makes the disabled note
  // meaningful, since a disabled authority is often unsigned.
  for (const { url, disabled } of authorities) {
    make(url, disabled ? 'disabled' : 'required');
  }

  for (const record of signatures) {
    const authority =
      signatureAuthority(record.message.signature) || fallbackAuthority(record);
    if (!authority) {
      continue;
    }
    const group = make(authority, 'other');
    if (!status.get(`${record.id}`)?.counted) {
      group.historical.push(record);
    } else if (isRejection(voteOf(record.message.signature))) {
      group.rejections.push(record);
    } else {
      group.signatures.push(record);
    }
  }

  // Required, then disabled, then everyone else: the principal's own
  // authorities in the account's order, the rest sorted so the table does not
  // reshuffle between renders.
  const rank: Record<AuthorityKind, number> = {
    required: 0,
    disabled: 1,
    other: 2,
  };
  const seeded = [...groups.values()];
  const sorted = seeded.slice().sort((a, b) => {
    if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];
    if (a.kind === 'other') {
      return `${a.authority}`.localeCompare(`${b.authority}`);
    }
    return seeded.indexOf(a) - seeded.indexOf(b);
  });
  return { groups: sorted, status };
}
