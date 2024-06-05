import { TransactionArgs } from 'accumulate.js/lib/core';

export interface Store {
  add(sign: Store.Sign, entry: Store.Entry): Promise<boolean>;
  [Symbol.iterator](): Generator<Store.Entry, void, undefined>;
}

export declare namespace Store {
  export type Entry = Note | RegisterBook;
  export type Sign = (txn: TransactionArgs) => Promise<boolean>;
}

export interface Note {
  type: 'note';
  value: string;
}

export interface RegisterBook {
  type: 'registerBook';
  url: string;
}
