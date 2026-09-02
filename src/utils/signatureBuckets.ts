import { URL, core } from 'accumulate.js';

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

export interface SignatureBuckets {
  /**
   * Records that are not in their signer's active set — present only for a
   * pending transaction. They are removed from the buckets below: a signature
   * the chain does not hold is not the authority's signature any more, and it
   * is not an outsider's either.
   *
   * A signature leaves the active set two ways, and `historical` does not say
   * which: a signature at a higher signer version replaced the set (it was
   * discarded and must be made again), or the signer emitted its own authority
   * signature, which clears the set (`maybeSendAuthoritySignature` —
   * "Sending an authority signature also clears the active signature set").
   * Neither counts toward a threshold, which is what this bucket asserts.
   * Telling the two apart means walking the delegation chain, which the
   * progress table above already does per authority entry.
   */
  invalid: SigRecord[];
  /** Still-counted records, keyed by lowercased required-authority URL. */
  byAuthority: Map<string, SigRecord[]>;
  /** Still-counted records belonging to no required authority. */
  other: SigRecord[];
}

/**
 * Sort raw signature records into the rows of the Required table.
 *
 * Every record lands in exactly one bucket. Before this, discarded signatures
 * were filed under the authority they were made for, so expanding
 * `staking.acme/book` on the period-196 distribution listed four signatures —
 * three of them dead — with nothing telling them apart, and a reader counted
 * four valid authority signatures where the chain counted one (#82).
 *
 * `Other` was not the right home for them either: it means "from an authority
 * this transaction does not require", which is a different claim from "the
 * chain has thrown this away".
 *
 * The test is the node's `historical` flag — the chain's own verdict, not an
 * inference — and it applies only while the transaction is pending: every
 * signature on a delivered one is historical because the active set is cleared
 * on execution, so bucketing by the flag there would call a distribution that
 * paid out entirely invalid (#81).
 */
export function bucketSignatures(
  signatures: readonly SigRecord[],
  authorities: readonly URL[],
  { pending = false }: { pending?: boolean } = {},
): SignatureBuckets {
  const invalid: SigRecord[] = [];
  const byAuthority = new Map<string, SigRecord[]>(
    authorities.map((x) => [`${x}`.toLowerCase(), []]),
  );
  const other: SigRecord[] = [];

  for (const record of signatures) {
    if (pending && record.historical) {
      invalid.push(record);
      continue;
    }
    const authority = signatureAuthority(record.message.signature);
    const bucket = authority && byAuthority.get(`${authority}`.toLowerCase());
    if (bucket) {
      bucket.push(record);
    } else {
      other.push(record);
    }
  }

  return { invalid, byAuthority, other };
}
