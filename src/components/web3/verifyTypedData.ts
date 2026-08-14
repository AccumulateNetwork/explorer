/**
 * Check that typed data returned by an `acc_typedData` endpoint describes the
 * transaction we asked it to describe.
 *
 * The endpoint renders EIP-712 typed data for a transaction, and the result is
 * handed straight to the wallet to sign. Nothing about the exchange is
 * authenticated, so a compromised or intercepted endpoint could return typed
 * data for a *different* transaction — paying a different recipient, or a
 * different amount — and the only thing standing between that and a signed
 * transfer is the user reading the wallet prompt closely (#60).
 *
 * The endpoint fills in defaults we did not send (empty strings, empty
 * arrays), so this is not a deep equality check. The rule is:
 *
 *   - every value we sent must appear, unchanged, where it belongs; and
 *   - every non-empty value in the response must be one we sent.
 *
 * The second half is what rejects an *added* recipient, which a one-way check
 * would happily sign.
 */

/** Values the endpoint supplies as placeholders rather than data. */
function isEmpty(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0)
  );
}

/**
 * Compare a value we sent against the one that came back. Hex is compared
 * without its 0x prefix and case-insensitively, numbers against their decimal
 * strings, and Accumulate URLs case-insensitively — all of which the endpoint
 * legitimately reformats.
 */
function sameScalar(mine: unknown, theirs: unknown): boolean {
  if (mine instanceof Uint8Array) {
    mine = Array.from(mine, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  const a = `${mine}`.toLowerCase().replace(/^0x/, '');
  const b = `${theirs}`.toLowerCase().replace(/^0x/, '');
  return a === b;
}

function compare(mine: unknown, theirs: unknown, path: string): string | null {
  if (isEmpty(mine)) {
    // We sent nothing here, so the endpoint must not have invented anything.
    return isEmpty(theirs) ? null : `${path}: added ${JSON.stringify(theirs)}`;
  }

  if (Array.isArray(mine)) {
    if (!Array.isArray(theirs)) {
      return `${path}: expected a list, got ${JSON.stringify(theirs)}`;
    }
    if (mine.length !== theirs.length) {
      // The added-recipient case.
      return `${path}: expected ${mine.length} entries, got ${theirs.length}`;
    }
    for (let i = 0; i < mine.length; i++) {
      const bad = compare(mine[i], theirs[i], `${path}[${i}]`);
      if (bad) return bad;
    }
    return null;
  }

  if (typeof mine === 'object') {
    if (typeof theirs !== 'object' || theirs === null) {
      return `${path}: expected an object, got ${JSON.stringify(theirs)}`;
    }
    const ours = mine as Record<string, unknown>;
    const other = theirs as Record<string, unknown>;
    for (const key of Object.keys(ours)) {
      const bad = compare(ours[key], other[key], `${path}.${key}`);
      if (bad) return bad;
    }
    for (const key of Object.keys(other)) {
      if (!(key in ours) && !isEmpty(other[key])) {
        return `${path}.${key}: added ${JSON.stringify(other[key])}`;
      }
    }
    return null;
  }

  return sameScalar(mine, theirs)
    ? null
    : `${path}: expected ${JSON.stringify(mine)}, got ${JSON.stringify(theirs)}`;
}

/**
 * Throw unless `message` faithfully represents `transaction` and `signature`.
 *
 * `transaction` and `signature` are the objects we posted to the endpoint;
 * `message` is the `message` of the typed data it returned. The transaction
 * body appears under a key named for its type (`sendTokens`, `addCredits`),
 * with the type itself carried by the typed-data schema rather than repeated.
 */
export function verifyTypedData(
  message: Record<string, any> | undefined,
  transaction: Record<string, any>,
  signature: Record<string, any>,
): void {
  if (!message || typeof message !== 'object') {
    throw new Error('Typed data has no message');
  }

  const problems: string[] = [];

  const header = compare(transaction.header, message.header, 'header');
  if (header) problems.push(header);

  // The body is keyed by its type, which the schema carries separately.
  const { type, ...body } = transaction.body || {};
  const bodyKey = Object.keys(message).find(
    (k) => k.toLowerCase() === `${type}`.toLowerCase(),
  );
  if (!bodyKey) {
    problems.push(`body: typed data does not describe a ${type}`);
  } else {
    const bad = compare(body, message[bodyKey], bodyKey);
    if (bad) problems.push(bad);
  }

  // Signature metadata binds the signature to our key, signer and timestamp.
  // chainID is ours but is carried in the domain, not the message.
  const { chainID, ...sig } = signature || {};
  const sigBad = compare(sig, message.signature, 'signature');
  if (sigBad) problems.push(sigBad);

  if (problems.length) {
    throw new Error(
      `The network returned typed data that does not match the transaction, ` +
        `so it was not signed — ${problems.join('; ')}`,
    );
  }
}
