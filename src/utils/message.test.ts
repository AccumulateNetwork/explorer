import { describe, expect, it } from 'vitest';

import { TransactionType } from 'accumulate.js/lib/core';
import { MessageType } from 'accumulate.js/lib/messaging';

import {
  extractPrincipal,
  extractTxType,
  formatTypeName,
  unwrapMessage,
} from './message';

// Synthetic and anchor traffic arrives wrapped in an envelope, so reading the
// type one level down reports how the message travelled (`sequenced`) rather
// than what it did (#33). These fixtures mirror the shapes accumulate.js
// produces, including the numeric enum values it parses to.

/** A bare user transaction: TransactionMessage at the top. */
const plainTxn = {
  message: {
    type: MessageType.Transaction,
    transaction: {
      header: { principal: 'acc://alice.acme/tokens' },
      body: { type: TransactionType.SendTokens },
    },
  },
};

/** The real mainnet shape: MessageRecord -> Sequenced -> Transaction. */
const sequencedTxn = {
  message: {
    type: MessageType.Sequenced,
    source: 'acc://bvn-Cyclops.acme',
    destination: 'acc://dn.acme',
    number: 1303,
    message: {
      type: MessageType.Transaction,
      transaction: {
        header: { principal: 'acc://acme' },
        body: { type: TransactionType.SyntheticBurnTokens, isRefund: true },
      },
    },
  },
};

describe('unwrapMessage', () => {
  it('walks down to the message carrying the transaction', () => {
    const inner = unwrapMessage(sequencedTxn.message);
    expect(inner).toBe(sequencedTxn.message.message);
    expect(inner.transaction.body.type).toBe(
      TransactionType.SyntheticBurnTokens,
    );
  });

  it('leaves an already-unwrapped message alone', () => {
    expect(unwrapMessage(plainTxn.message)).toBe(plainTxn.message);
  });

  it('unwraps more than one layer', () => {
    const doubled = { type: 99, message: sequencedTxn.message };
    expect(unwrapMessage(doubled)).toBe(sequencedTxn.message.message);
  });

  it('stops rather than looping on a self-referential message', () => {
    const cyclic: any = { type: 99 };
    cyclic.message = cyclic;
    expect(() => unwrapMessage(cyclic)).not.toThrow();
  });

  it('tolerates null and non-objects', () => {
    expect(unwrapMessage(null)).toBeNull();
    expect(unwrapMessage(undefined)).toBeUndefined();
    expect(unwrapMessage('nope')).toBe('nope');
  });
});

describe('extractTxType', () => {
  it('names the inner transaction of a sequenced message', () => {
    // Previously returned 'sequenced' — the envelope, not the transaction.
    expect(extractTxType(sequencedTxn)).toBe('syntheticBurnTokens');
  });

  it('still names a plain transaction', () => {
    expect(extractTxType(plainTxn)).toBe('sendTokens');
  });

  it('accepts an already-stringified body type', () => {
    expect(
      extractTxType({
        message: { transaction: { body: { type: 'addCredits' } } },
      }),
    ).toBe('addCredits');
  });

  it('handles ChainEntryRecord-style .value.message wrapping', () => {
    expect(extractTxType({ value: sequencedTxn })).toBe('syntheticBurnTokens');
  });

  it('falls back to the message type when there is no transaction', () => {
    expect(extractTxType({ message: { type: MessageType.Signature } })).toBe(
      'signature',
    );
  });

  it('returns undefined for junk rather than throwing', () => {
    expect(extractTxType(null)).toBeUndefined();
    expect(extractTxType({})).toBeUndefined();
    expect(extractTxType({ message: {} })).toBeUndefined();
  });
});

describe('extractPrincipal', () => {
  it('reads the principal through a sequenced envelope', () => {
    // Previously undefined, so the row fell back to a bare hash.
    expect(extractPrincipal(sequencedTxn)).toBe('acc://acme');
  });

  it('reads the principal of a plain transaction', () => {
    expect(extractPrincipal(plainTxn)).toBe('acc://alice.acme/tokens');
  });

  it('returns undefined when there is no transaction', () => {
    expect(
      extractPrincipal({ message: { type: MessageType.Signature } }),
    ).toBeUndefined();
    expect(extractPrincipal(null)).toBeUndefined();
  });
});

describe('formatTypeName', () => {
  it('spaces and capitalises camelCase, matching the Type row', () => {
    expect(formatTypeName('syntheticBurnTokens')).toBe('Synthetic Burn Tokens');
    expect(formatTypeName('sendTokens')).toBe('Send Tokens');
    expect(formatTypeName('transaction')).toBe('Transaction');
  });

  it('leaves an empty string alone', () => {
    expect(formatTypeName('')).toBe('');
  });
});
