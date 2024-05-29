import {
  AccountRecord,
  ChainEntryRecord,
  MessageRecord,
  Record,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import {
  Account,
  AccountType,
  DataEntry,
  FactomDataEntryWrapper,
  SyntheticWriteData,
  SystemWriteData,
  Transaction,
  TransactionBody,
  TransactionType,
  WriteData,
  WriteDataTo,
} from 'accumulate.js/lib/core';
import { MessageType, TransactionMessage } from 'accumulate.js/lib/messaging';

type UnionMemberByType<Union, Type, Key extends keyof Union> = Union extends {
  [_ in Key]: Type;
}
  ? Union
  : never;

export type AccountRecordOf<T extends Account> = AccountRecord & {
  account?: T;
};

type AccountFor<Type extends Account['type']> = UnionMemberByType<
  Account,
  Type,
  'type'
>;

export function isRecordOfAccount<Type extends Account['type']>(
  r: Record,
  type: Type,
): r is AccountRecordOf<AccountFor<Type>> {
  if (r.recordType !== RecordType.Account) {
    return false;
  }
  return r.account.type === type;
}

export type TxnWithBody<T extends TransactionBody> = Transaction & { body?: T };
export type TxnMessage<T extends TransactionBody = TransactionBody> =
  TransactionMessage & {
    transaction?: TxnWithBody<T>;
  };
export type TxnRecord<T extends TransactionBody = TransactionBody> =
  MessageRecord<TxnMessage<T>>;
export type TxnEntry<T extends TransactionBody = TransactionBody> =
  ChainEntryRecord<TxnRecord<T>>;

type TxnBodyFor<Type extends TransactionBody['type']> = UnionMemberByType<
  TransactionBody,
  Type,
  'type'
>;

export function isRecordOfTxn<Type extends TransactionBody['type']>(
  r: Record,
  type: Type,
): r is TxnRecord<TxnBodyFor<Type>> | TxnEntry<TxnBodyFor<Type>> {
  if (r.recordType === RecordType.ChainEntry) {
    r = r.value;
  }
  if (r.recordType !== RecordType.Message) {
    return false;
  }
  if (r.message.type !== MessageType.Transaction) {
    return false;
  }
  return r.message.transaction.body.type === type;
}

type DataTxnBody =
  | WriteData
  | WriteDataTo
  | SyntheticWriteData
  | SystemWriteData;
export type DataTxnRecord = TxnRecord<DataTxnBody>;
export type DataTxnEntry = TxnEntry<DataTxnBody>;

export function isData(r: Record): r is DataTxnRecord | DataTxnEntry {
  if (r.recordType === RecordType.ChainEntry) {
    r = r.value;
  }
  if (r.recordType !== RecordType.Message) {
    return false;
  }
  if (r.message.type !== MessageType.Transaction) {
    return false;
  }

  switch (r.message.transaction.body.type) {
    case TransactionType.WriteData:
    case TransactionType.WriteDataTo:
    case TransactionType.SyntheticWriteData:
    case TransactionType.SystemWriteData:
      return true;
  }
  return false;
}

export function dataEntryParts(entry: DataEntry): Uint8Array[] {
  if (!(entry instanceof FactomDataEntryWrapper)) {
    return entry.data;
  }
  return [entry.data, ...entry.extIds];
}
