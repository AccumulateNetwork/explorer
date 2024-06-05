import {
  AccountRecord,
  ChainEntryRecord,
  ErrorRecord,
  MessageRecord,
  Record,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import {
  Account,
  AccountType,
  DataEntry,
  FactomDataEntryWrapper,
  Signature,
  SignatureType,
  SyntheticWriteData,
  SystemWriteData,
  Transaction,
  TransactionBody,
  TransactionType,
  WriteData,
  WriteDataTo,
} from 'accumulate.js/lib/core';
import { Encoding, Enum } from 'accumulate.js/lib/encoding';
import { Status } from 'accumulate.js/lib/errors';
import {
  Message,
  MessageType,
  SignatureMessage,
  TransactionMessage,
} from 'accumulate.js/lib/messaging';

export type IsNameOf<T, S> = T extends { getName(_: any): infer R }
  ? S extends R
    ? S
    : never
  : never;

export type AccountRecordOf<T extends Account> = AccountRecord & {
  account?: T;
};

export type MsgRecord<T extends Message> = MessageRecord<T>;
export type MsgEntry<T extends Message> = ChainEntryRecord<MsgRecord<T>>;

export type SigMessage<T extends Signature = Signature> = SignatureMessage & {
  signature?: T;
};
export type SigRecord<T extends Signature = Signature> = MessageRecord<
  SigMessage<T>
>;
export type SigEntry<T extends Signature = Signature> = ChainEntryRecord<
  SigRecord<T>
>;

export type TxnWithBody<T extends TransactionBody> = Transaction & { body?: T };
export type TxnMessage<T extends TransactionBody = TransactionBody> =
  TransactionMessage & {
    transaction?: TxnWithBody<T>;
  };
export type TxnRecord<T extends TransactionBody = TransactionBody> =
  MessageRecord<TxnMessage<T>>;
export type TxnEntry<T extends TransactionBody = TransactionBody> =
  ChainEntryRecord<TxnRecord<T>>;

export type Ctor<Of = any> = abstract new (...args: any) => Of;

type TxnRecordOrEntry<T extends TransactionBody> = TxnRecord<T> | TxnEntry<T>;
type SigRecordOrEntry<T extends Signature> = SigRecord<T> | SigEntry<T>;
type MsgRecordOrEntry<T extends Message> = MsgRecord<T> | MsgEntry<T>;

type TxnCtor = Ctor<TransactionBody>;

// Overload for errors
export function isRecordOf<S extends Status>(
  r: Record,
  ...types: [S]
): r is ErrorRecord & { value?: { status?: S } };

// Overloads for accounts
export function isRecordOf<C extends Ctor<Account>>(
  r: Record,
  ...types: [C]
): r is AccountRecordOf<InstanceType<C>>;
export function isRecordOf<C extends [Ctor<Account>, Ctor<Account>]>(
  r: Record,
  ...types: C
): r is AccountRecordOf<InstanceType<C[0]> | InstanceType<C[1]>>;

// Overload for messages
export function isRecordOf<C extends Ctor<Message>>(
  r: Record,
  ...types: [C]
): r is MsgRecordOrEntry<InstanceType<C>>;

// Overloads for transactions
export function isRecordOf<C extends TxnCtor>(
  r: Record,
  ...types: [C]
): r is TxnRecordOrEntry<InstanceType<C>>;
export function isRecordOf<C extends [TxnCtor, TxnCtor]>(
  r: Record,
  ...types: C
): r is TxnRecordOrEntry<InstanceType<C[0]> | InstanceType<C[1]>>;
export function isRecordOf<C extends [TxnCtor, TxnCtor, TxnCtor]>(
  r: Record,
  ...types: C
): r is TxnRecordOrEntry<
  InstanceType<C[0]> | InstanceType<C[1]> | InstanceType<C[2]>
>;
export function isRecordOf<C extends [TxnCtor, TxnCtor, TxnCtor, TxnCtor]>(
  r: Record,
  ...types: C
): r is TxnRecordOrEntry<
  | InstanceType<C[0]>
  | InstanceType<C[1]>
  | InstanceType<C[2]>
  | InstanceType<C[3]>
>;

// Overload for signatures
export function isRecordOf<C extends Ctor<Signature>>(
  r: Record,
  ...types: [C]
): r is SigRecordOrEntry<InstanceType<C>>;

export function isRecordOf<C extends Array<Ctor>>(
  r: Record,
  ...types: C
): boolean {
  return types.some((type) => checkRecordType(r, type));
}

/**
 * Returns true if the record contains the given account, message, transaction,
 * or signature type.
 * @param r The record
 * @param type The constructor of the given type
 * @returns Whether the record contains the given type
 */
function checkRecordType(r: Record, type: Ctor | Status): boolean {
  if (typeof type === 'number') {
    if (r.recordType !== RecordType.Error) {
      return false;
    }
    return r.value.code === type;
  }

  // Get the discriminator enum type from the constructor
  const enc = Encoding.forClass(type);
  const [field] = enc?.fields;
  if (!(field?.type instanceof Enum)) {
    return false;
  }

  switch ((field.type as Enum).type) {
    case AccountType:
      if (r.recordType !== RecordType.Account) {
        return false;
      }
      return r.account instanceof type;

    case MessageType:
      if (r.recordType === RecordType.ChainEntry) {
        r = r.value;
      }
      if (r.recordType !== RecordType.Message) {
        return false;
      }
      return r.message instanceof type;

    case SignatureType:
      if (r.recordType === RecordType.ChainEntry) {
        r = r.value;
      }
      if (r.recordType !== RecordType.Message) {
        return false;
      }
      if (r.message.type !== MessageType.Signature) {
        return false;
      }
      return r.message.signature instanceof type;

    case TransactionType:
      if (r.recordType === RecordType.ChainEntry) {
        r = r.value;
      }
      if (r.recordType !== RecordType.Message) {
        return false;
      }
      if (r.message.type !== MessageType.Transaction) {
        return false;
      }
      return r.message.transaction.body instanceof type;

    default:
      return false;
  }
}

type DataTxnBody =
  | WriteData
  | WriteDataTo
  | SyntheticWriteData
  | SystemWriteData;
export type DataTxnRecord = TxnRecord<DataTxnBody>;
export type DataTxnEntry = TxnEntry<DataTxnBody>;

export function isRecordOfDataTxn(
  r: Record,
): r is DataTxnRecord | DataTxnEntry {
  return isRecordOf(
    r,
    WriteData,
    WriteDataTo,
    SyntheticWriteData,
    SystemWriteData,
  );
}

export function dataEntryParts(entry: DataEntry): Uint8Array[] {
  if (!(entry instanceof FactomDataEntryWrapper)) {
    return entry.data.map((x) => x || new Uint8Array());
  }
  return [entry.data, ...entry.extIds].map((x) => x || new Uint8Array());
}
