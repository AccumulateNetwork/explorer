import { URL, core } from 'accumulate.js';
import { VoteType } from 'accumulate.js/lib/core';

import { SigRecord } from './types';

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
   * Records that are not in the signer's active set, whatever they voted. A
   * rejection can be historical too: a signer who rejects and then signs again
   * leaves the rejection behind here.
   */
  historical: SigRecord[];
}

export interface RequiredAuthority {
  url: URL;
  disabled?: boolean;
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
 * The one rule of our own is `pending`. Every signature on a delivered
 * transaction is historical, because the active set is cleared on execution
 * (`msg_transaction.go`), so the grouping is switched off there rather than
 * filing a distribution that paid out as entirely historical (#81).
 */
export function groupSignatures(
  signatures: readonly SigRecord[],
  authorities: readonly RequiredAuthority[],
  { pending = false }: { pending?: boolean } = {},
): AuthorityGroup[] {
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
    if (pending && record.historical) {
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
  return seeded.slice().sort((a, b) => {
    if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];
    if (a.kind === 'other') {
      return `${a.authority}`.localeCompare(`${b.authority}`);
    }
    return seeded.indexOf(a) - seeded.indexOf(b);
  });
}
