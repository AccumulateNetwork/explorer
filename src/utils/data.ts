import {
  ChainEntryRecord,
  MessageRecord,
  Record,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import {
  DataEntry,
  FactomDataEntryWrapper,
  SyntheticWriteData,
  SystemWriteData,
  Transaction,
  TransactionType,
  WriteData,
  WriteDataTo,
} from 'accumulate.js/lib/core';
import { MessageType, TransactionMessage } from 'accumulate.js/lib/messaging';

export type TxnRecord = MessageRecord<TransactionMessage>;
export type TxnEntry = ChainEntryRecord<TxnRecord>;

export type DataTxnBody =
  | WriteData
  | WriteDataTo
  | SyntheticWriteData
  | SystemWriteData;
export type DataTxn = Transaction & { body?: DataTxnBody };
export type DataTxnMessage = TransactionMessage & { transaction?: DataTxn };
export type DataTxnRecord = MessageRecord<DataTxnMessage>;
export type DataTxnEntry = ChainEntryRecord<DataTxnRecord>;

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
