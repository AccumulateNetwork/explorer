import { AccountType, TransactionArgs } from 'accumulate.js/lib/core';

export interface Store {
  add(sign: Store.Sign, entry: Store.Entry): Promise<boolean>;
  [Symbol.iterator](): Generator<Store.Entry, void, undefined>;
}

// Type-only namespace merged with the Store interface so callers can write
// Store.Entry / Store.Sign. Replacing it means renaming those types at every
// call site, which is a refactor, not a lint fix (#65).
// eslint-disable-next-line @typescript-eslint/no-namespace -- declaration merging, see above
export declare namespace Store {
  export type Entry = Note | LinkAccount | UnlinkAccount;
  export type Sign = (txn: TransactionArgs) => Promise<boolean>;
}

export interface Note {
  type: 'note';
  value: string;
}

export interface LinkAccount {
  type: 'link';
  url: string;
  accountType: ReturnType<typeof AccountType.getName>;
}

export interface UnlinkAccount {
  type: 'unlink';
  url: string;
}
