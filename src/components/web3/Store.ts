import { TransactionArgs } from 'accumulate.js/lib/core';

export interface Store {
  get(hash: string | Uint8Array): Store.Entry | undefined;
  add(sign: Store.Sign, plain: Store.Entry): Promise<boolean>;
  [Symbol.iterator](): Generator<Store.Entry, void, void>;
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
