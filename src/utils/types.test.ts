import { describe, expect, it } from 'vitest';

import { errors } from 'accumulate.js';
import { Record } from 'accumulate.js/lib/api_v3';
import {
  DataAccount,
  ED25519Signature,
  KeyPage,
  SendTokens,
  TokenAccount,
  WriteData,
} from 'accumulate.js/lib/core';
import {
  SignatureMessage,
  TransactionMessage,
} from 'accumulate.js/lib/messaging';

import {
  dataEntryParts,
  hydrate,
  isRecordOf,
  isRecordOfDataTxn,
} from './types';

// isRecordOf decides which component renders a record — account page versus
// transaction page versus 404 — so getting it wrong shows the user the wrong
// thing rather than throwing. It discriminates on four different enum
// families plus error status, and had no tests.

// `Record` here is Accumulate's API record, which shadows TypeScript's
// built-in Record<K, V> — hence the spelled-out object type.
const account = (type: string, extra: { [key: string]: unknown } = {}) =>
  Record.fromObject({
    recordType: 'account',
    account: { type, url: 'acc://alice.acme/x', ...extra },
  } as never);

const transaction = (bodyType: string) =>
  Record.fromObject({
    recordType: 'message',
    status: 'delivered',
    message: {
      type: 'transaction',
      transaction: {
        header: { principal: 'acc://alice.acme' },
        body: { type: bodyType },
      },
    },
  } as never);

const signature = (type: string) =>
  Record.fromObject({
    recordType: 'message',
    status: 'delivered',
    message: {
      type: 'signature',
      signature: {
        type,
        publicKey: '00'.repeat(32),
        signer: 'acc://alice.acme/book/1',
      },
      txID: `acc://${'a'.repeat(64)}@alice.acme`,
    },
  } as never);

/** A record as it arrives from a chain query, wrapping the message. */
const onChain = (value: unknown, name = 'main') =>
  Record.fromObject({
    recordType: 'chainEntry',
    name,
    index: 3,
    value,
  } as never);

const errorRecord = (code: string) =>
  Record.fromObject({
    recordType: 'error',
    value: { code, message: 'x' },
  } as never);

describe('isRecordOf, accounts', () => {
  it('recognizes the account type it was given', () => {
    expect(isRecordOf(account('tokenAccount'), TokenAccount)).toBe(true);
    expect(isRecordOf(account('dataAccount'), DataAccount)).toBe(true);
  });

  it('rejects a different account type', () => {
    expect(isRecordOf(account('tokenAccount'), DataAccount)).toBe(false);
  });

  it('accepts any of several types', () => {
    expect(isRecordOf(account('keyPage'), TokenAccount, KeyPage)).toBe(true);
    expect(isRecordOf(account('keyPage'), TokenAccount, DataAccount)).toBe(
      false,
    );
  });

  it('does not confuse an account with a message', () => {
    expect(isRecordOf(transaction('sendTokens'), TokenAccount)).toBe(false);
  });
});

describe('isRecordOf, messages and transactions', () => {
  it('recognizes the message wrapper', () => {
    expect(isRecordOf(transaction('sendTokens'), TransactionMessage)).toBe(
      true,
    );
    expect(isRecordOf(transaction('sendTokens'), SignatureMessage)).toBe(false);
  });

  it('reaches through the message to the transaction body', () => {
    expect(isRecordOf(transaction('sendTokens'), SendTokens)).toBe(true);
    expect(isRecordOf(transaction('sendTokens'), WriteData)).toBe(false);
  });

  it('does not treat a transaction as a signature', () => {
    expect(isRecordOf(transaction('sendTokens'), ED25519Signature)).toBe(false);
  });
});

// Chain queries never return a bare message — every row of every transaction
// table arrives wrapped in a ChainEntryRecord. checkRecordType unwraps it in
// its message, signature, and transaction branches; if that unwrapping broke,
// every chain table would render as unrecognized rows rather than throwing.
describe('isRecordOf, records wrapped in a chain entry', () => {
  it('reaches through the entry to the message', () => {
    const entry = onChain(transaction('sendTokens'));
    expect(isRecordOf(entry, TransactionMessage)).toBe(true);
    expect(isRecordOf(entry, SignatureMessage)).toBe(false);
  });

  it('reaches through the entry to the transaction body', () => {
    expect(isRecordOf(onChain(transaction('sendTokens')), SendTokens)).toBe(
      true,
    );
    expect(isRecordOf(onChain(transaction('sendTokens')), WriteData)).toBe(
      false,
    );
  });

  it('reaches through the entry to the signature', () => {
    const entry = onChain(signature('ed25519'), 'signature');
    expect(isRecordOf(entry, ED25519Signature)).toBe(true);
    expect(isRecordOf(entry, SendTokens)).toBe(false);
  });

  it('agrees with the unwrapped record', () => {
    // The two forms reach the page through different queries; they must not
    // disagree about what a record is.
    for (const type of [TransactionMessage, SendTokens, WriteData]) {
      expect(
        isRecordOf(onChain(transaction('sendTokens')), type as never),
      ).toBe(isRecordOf(transaction('sendTokens'), type as never));
    }
  });

  it('recognizes a data transaction on a chain', () => {
    expect(isRecordOfDataTxn(onChain(transaction('writeData')))).toBe(true);
    expect(isRecordOfDataTxn(onChain(transaction('sendTokens')))).toBe(false);
  });

  it('does not unwrap an entry when asked for an account', () => {
    // Accounts are never chain entries, and the account branch does not
    // unwrap — an entry must not be mistaken for the account it belongs to.
    expect(isRecordOf(onChain(transaction('sendTokens')), TokenAccount)).toBe(
      false,
    );
  });
});

describe('isRecordOf, error status', () => {
  it('matches on the status code', () => {
    expect(isRecordOf(errorRecord('notFound'), errors.Status.NotFound)).toBe(
      true,
    );
    // The distinction the 404 page depends on: missing, versus broken.
    expect(
      isRecordOf(errorRecord('internalError'), errors.Status.NotFound),
    ).toBe(false);
  });

  it('does not report a successful record as an error', () => {
    expect(isRecordOf(transaction('sendTokens'), errors.Status.NotFound)).toBe(
      false,
    );
    expect(isRecordOf(account('tokenAccount'), errors.Status.NotFound)).toBe(
      false,
    );
  });
});

describe('isRecordOfDataTxn', () => {
  it('recognizes a data transaction', () => {
    expect(isRecordOfDataTxn(transaction('writeData'))).toBe(true);
  });

  it('rejects a transaction that writes no data', () => {
    expect(isRecordOfDataTxn(transaction('sendTokens'))).toBe(false);
  });
});

describe('dataEntryParts', () => {
  it('returns the parts of a plain data entry', () => {
    const entry: any = {
      data: [new Uint8Array([1, 2]), new Uint8Array([3])],
    };
    expect(dataEntryParts(entry)).toEqual([
      new Uint8Array([1, 2]),
      new Uint8Array([3]),
    ]);
  });

  it('substitutes an empty array for a missing part', () => {
    // A hole here used to reach the renderer as undefined.
    const entry: any = { data: [new Uint8Array([1]), undefined] };
    expect(dataEntryParts(entry)).toEqual([
      new Uint8Array([1]),
      new Uint8Array(),
    ]);
  });
});

describe('hydrate', () => {
  class Thing {
    value: number;
    constructor(args: { value: number }) {
      this.value = args.value;
    }
  }

  it('builds one instance from a constructor', () => {
    expect(hydrate({ value: 3 }, Thing)).toBeInstanceOf(Thing);
    expect(hydrate({ value: 3 }, Thing).value).toBe(3);
  });

  it('builds a list', () => {
    const out = hydrate([{ value: 1 }, { value: 2 }], Thing);
    expect(out).toHaveLength(2);
    expect(out.map((x) => x.value)).toEqual([1, 2]);
  });

  it('prefers fromObject when the type provides one', () => {
    const factory = {
      fromObject: (args: { value: number }) =>
        new Thing({ value: args.value * 10 }),
    };
    expect(hydrate({ value: 4 }, factory).value).toBe(40);
    expect(
      hydrate([{ value: 1 }, { value: 2 }], factory).map((x) => x.value),
    ).toEqual([10, 20]);
  });
});
