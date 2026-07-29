import { TransactionType } from 'accumulate.js/lib/core';
import { MessageType } from 'accumulate.js/lib/messaging';

/**
 * Unwrap envelope messages down to the one that carries the transaction.
 *
 * Synthetic and anchor traffic does not arrive as a bare TransactionMessage.
 * A SequencedMessage (and likewise SyntheticMessage/BadSyntheticMessage) holds
 * the payload in `.message`, not in `.transaction`:
 *
 *     MessageRecord -> SequencedMessage -> TransactionMessage -> body.type
 *
 * Reading the type straight off the envelope reports `sequenced`, which says
 * how the message travelled rather than what it did, so walk down to the
 * payload first. Returns the input unchanged when nothing is wrapped.
 */
export function unwrapMessage(msg: any): any {
  const seen = new Set<any>();
  while (
    msg &&
    typeof msg === 'object' &&
    !('transaction' in msg) &&
    'message' in msg &&
    msg.message
  ) {
    if (seen.has(msg)) break;
    seen.add(msg);
    msg = msg.message;
  }
  return msg;
}

/**
 * Pull a transaction-type string from a MessageRecord-shaped object.
 * Robust to missing fields so a single malformed tx doesn't break an
 * enrichment pass. Resolution order (each falls through to the next):
 * 1. `body.type` as string  — user transactions (`sendTokens`, etc.)
 * 2. `body.type` as number  — map via `TransactionType.getName`
 * 3. `msg.type` as string   — already-stringified message type
 * 4. `msg.type` as number   — map via `MessageType.getName`
 * Handles records wrapped in `.value.message` (ChainEntryRecord-style),
 * records where the message is at the root (no `.message` wrapper), and
 * envelope messages (see {@link unwrapMessage}).
 */
export function extractTxType(record: any): string | undefined {
  if (!record) return undefined;
  const msg = unwrapMessage(
    record?.message ?? record?.value?.message ?? record,
  );
  if (!msg) return undefined;
  const bodyType = msg?.transaction?.body?.type;
  if (typeof bodyType === 'string' && bodyType) return bodyType;
  if (typeof bodyType === 'number') {
    try {
      const name = TransactionType.getName(bodyType);
      if (name) return name;
    } catch {
      /* fall through */
    }
  }
  const msgType = msg?.type;
  if (typeof msgType === 'string' && msgType) return msgType;
  if (typeof msgType === 'number') {
    try {
      const name = MessageType.getName(msgType);
      if (name) return name;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * The principal (account) a message acts on, unwrapping envelopes first so
 * synthetic traffic reports the account instead of nothing.
 */
export function extractPrincipal(record: any): string | undefined {
  const msg = unwrapMessage(
    record?.message ?? record?.value?.message ?? record,
  );
  if (!msg || typeof msg !== 'object' || !('transaction' in msg)) {
    return undefined;
  }
  return msg.transaction?.header?.principal?.toString();
}

/**
 * Render a camelCase enum name as spaced title case — `syntheticBurnTokens`
 * becomes `Synthetic Burn Tokens`, matching the Transaction Type row.
 */
export function formatTypeName(name: string): string {
  return name.replace(/(^[a-z]|[a-z][A-Z])/g, (s) =>
    s.length === 1 ? s.toUpperCase() : s.substring(0, 1) + ' ' + s.substring(1),
  );
}
