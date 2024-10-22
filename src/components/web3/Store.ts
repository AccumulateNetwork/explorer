import { AccountType, TransactionArgs } from 'accumulate.js/lib/core';


export interface Store {
  add(sign: Store.Sign, entry: Store.Entry): Promise<boolean>;
  [Symbol.iterator](): Generator<Store.Entry, void, undefined>;
}

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
