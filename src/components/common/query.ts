import { useContext } from 'react';

import { TxID, URLArgs, core, errors, messaging } from 'accumulate.js';
import {
  AccountRecord,
  AnchorSearchQueryArgsWithType,
  BlockQueryArgsWithType,
  ChainEntryRecord,
  ChainQueryArgsWithType,
  ChainRecord,
  DataQueryArgsWithType,
  DefaultQueryArgsWithType,
  DelegateSearchQueryArgsWithType,
  DirectoryQueryArgsWithType,
  ErrorRecord,
  JsonRpcClient,
  KeyRecord,
  MajorBlockRecord,
  MessageHashSearchQueryArgsWithType,
  MessageRecord,
  MinorBlockRecord,
  PendingQueryArgsWithType,
  PublicKeyHashSearchQueryArgsWithType,
  PublicKeySearchQueryArgsWithType,
  QueryArgs,
  Record,
  RecordRange,
  RecordType,
  RpcError,
  TxIDRecord,
  UrlRecord,
} from 'accumulate.js/lib/api_v3';
import { Account, DataEntry } from 'accumulate.js/lib/core';
import { Error as Error2, Status } from 'accumulate.js/lib/errors';
import { EnvelopeArgs } from 'accumulate.js/lib/messaging';

import {
  Ctor,
  TxnEntry,
  isRecordOf,
  isRecordOfDataTxn,
} from '../../utils/types';
import { Shared } from './Network';
import { useAsyncEffect } from './useAsync';

export function queryEffect(
  scope: URLArgs | TxID,
  query?: DefaultQueryArgsWithType,
  dependencies?: any[],
): QueryEffect<AccountRecord | MessageRecord | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<ChainQueryArgsWithType, 'queryType'>,
  dependencies?: any[],
): QueryEffect<RecordRange<ChainRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<ChainQueryArgsWithType, 'queryType' | 'name'>,
  dependencies?: any[],
): QueryEffect<ChainRecord | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    ChainQueryArgsWithType,
    'queryType' | 'name' | 'index' | 'includeReceipt'
  >,
  dependencies?: any[],
): QueryEffect<ChainEntryRecord | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    ChainQueryArgsWithType,
    'queryType' | 'name' | 'entry' | 'includeReceipt'
  >,
  dependencies?: any[],
): QueryEffect<ChainEntryRecord | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    ChainQueryArgsWithType,
    'queryType' | 'name' | 'range' | 'includeReceipt'
  >,
  dependencies?: any[],
): QueryEffect<RecordRange<ChainEntryRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<DataQueryArgsWithType, 'queryType'>,
  dependencies?: any[],
): QueryEffect<
  ChainEntryRecord<MessageRecord<messaging.TransactionMessage>> | ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<DataQueryArgsWithType, 'queryType' | 'index'>,
  dependencies?: any[],
): QueryEffect<
  ChainEntryRecord<MessageRecord<messaging.TransactionMessage>> | ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<DataQueryArgsWithType, 'queryType' | 'entry'>,
  dependencies?: any[],
): QueryEffect<
  ChainEntryRecord<MessageRecord<messaging.TransactionMessage>> | ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<DataQueryArgsWithType, 'queryType' | 'range'>,
  dependencies?: any[],
): QueryEffect<
  | RecordRange<ChainEntryRecord<MessageRecord<messaging.TransactionMessage>>>
  | ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<DirectoryQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand?: false };
  },
  dependencies?: any[],
): QueryEffect<RecordRange<UrlRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<DirectoryQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand: true };
  },
  dependencies?: any[],
): QueryEffect<RecordRange<AccountRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<PendingQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand?: false };
  },
  dependencies?: any[],
): QueryEffect<RecordRange<TxIDRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<PendingQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand: true };
  },
  dependencies?: any[],
): QueryEffect<
  RecordRange<MessageRecord<messaging.TransactionMessage>> | ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    BlockQueryArgsWithType,
    'queryType' | 'minor' | 'entryRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): QueryEffect<MinorBlockRecord | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    BlockQueryArgsWithType,
    'queryType' | 'major' | 'minorRange' | 'entryRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): QueryEffect<MajorBlockRecord | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<BlockQueryArgsWithType, 'queryType' | 'minorRange' | 'omitEmpty'>,
  dependencies?: any[],
): QueryEffect<RecordRange<MinorBlockRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<BlockQueryArgsWithType, 'queryType' | 'majorRange' | 'omitEmpty'>,
  dependencies?: any[],
): QueryEffect<RecordRange<MajorBlockRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    AnchorSearchQueryArgsWithType,
    'queryType' | 'anchor' | 'includeReceipt'
  >,
  dependencies?: any[],
): QueryEffect<RecordRange<ChainEntryRecord<never>> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    PublicKeySearchQueryArgsWithType,
    'queryType' | 'publicKey' | 'type'
  >,
  dependencies?: any[],
): QueryEffect<RecordRange<KeyRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    PublicKeyHashSearchQueryArgsWithType,
    'queryType' | 'publicKeyHash'
  >,
  dependencies?: any[],
): QueryEffect<RecordRange<KeyRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<DelegateSearchQueryArgsWithType, 'queryType' | 'delegate'>,
  dependencies?: any[],
): QueryEffect<RecordRange<KeyRecord> | ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<MessageHashSearchQueryArgsWithType, 'queryType' | 'hash'>,
  dependencies?: any[],
): QueryEffect<RecordRange<MessageRecord> | ErrorRecord>;

export function queryEffect(
  scope: URLArgs | TxID,
  query: QueryArgs,
  dependencies?: any[],
): QueryEffect<Record> {
  const ctx = useContext(Shared);
  return {
    then<T1>(effect?: Call<Record, T1>) {
      const node = new CallNode(effect);

      useAsyncEffect(
        async (mounted) => {
          if (!scope || !ctx.api) {
            return;
          }

          const r = await ctx.api
            .query(scope, query as any)
            .catch(isErrorRecord)
            .catch((err) => (ctx.onApiError(err), null));
          if (!r || !mounted()) {
            return;
          }

          node.call(r);
        },
        [
          ctx.network,
          `${scope}`,
          JSON.stringify(query),
          ...(dependencies || []),
        ],
      );

      return node;
    },
  };
}

export function isErrorRecord(error: any) {
  try {
    if (
      typeof error === 'object' &&
      'data' in error &&
      typeof error.data === 'object'
    ) {
      return new ErrorRecord({ value: new errors.Error(error.data) });
    }
  } catch (_) {}
  throw error;
}

export type Call<In = void, Out = void> = (_: In) => Out | PromiseLike<Out>;

export interface QueryEffect<T1 extends Record> {
  then<T2>(effect: Call<T1, T2>): Thenable<T2>;
}

export interface Thenable<T1> {
  then<T2>(onresolve: Call<T1, T2>);
  catch<T2>(onreject: Call<any, T2>);
  finally(onfinally: Call);
}

class CallNode<T1, T2> implements Thenable<T2> {
  readonly #callback: Call<T1, T2>;
  readonly #onresolve: Call<T2>[] = [];
  readonly #onreject: Call<any>[] = [];

  constructor(cb: Call<T1, T2>) {
    this.#callback = cb;
  }

  call(v1: T1) {
    const v2 = (async () => await this.#callback(v1))();

    const onresolve = this.#onresolve.length
      ? (x: T2) => Promise.all(this.#onresolve.map((fn) => fn(x)))
      : null;
    const onreject = this.#onreject.length
      ? (x) => Promise.all(this.#onreject.map((fn) => fn(x)))
      : null;

    v2.then(onresolve, onreject);
  }

  then<T3>(onresolve: Call<T2, T3>) {
    const node = new CallNode(onresolve);
    this.#onresolve.push((x) => node.call(x));
    return node;
  }

  catch<T3>(onreject: Call<any, T3>) {
    const node = new CallNode(onreject);
    this.#onreject.push((x) => node.call(x));
    return node;
  }

  finally(onfinally: Call<any>) {
    const node = new CallNode(onfinally);
    this.#onresolve.push((x) => node.call(x));
    this.#onreject.push((x) => node.call(x));
    return node;
  }
}

const waitTime = 500;
const waitLimit = 30_000 / waitTime;

export async function submitAndWait(api: JsonRpcClient, env: EnvelopeArgs) {
  const results = await api.submit(env);
  const error = results.filter((x) => !x.success).map((x) => x.message);
  if (error.length) {
    throw new Error(error.join('\n'));
  }

  await waitForEach(
    api,
    results.map((r) => r.status.txID),
  );
}

async function waitFor(api: JsonRpcClient, txid: TxID | URLArgs) {
  const r = await waitForSingle(api, txid);
  await waitForEach(api, r.produced?.records?.map((r) => r.value) || []);
  return r;
}

async function waitForEach(api: JsonRpcClient, txids: TxID[]) {
  await Promise.all(txids.map((id) => id && waitFor(api, id)));
}

async function waitForSingle(api: JsonRpcClient, txid: TxID | URLArgs) {
  console.log(`Waiting for ${txid}`);
  for (let i = 0; i < waitLimit; i++) {
    try {
      const r = (await api.query(txid)) as MessageRecord;
      if (r.status === Status.Delivered) {
        return r;
      }

      // Status is pending or unknown
      await new Promise((r) => setTimeout(r, waitTime));
      continue;
    } catch (error) {
      const err2 = isClientError(error);
      if (err2.code === Status.NotFound) {
        // Not found
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      throw new Error(`Transaction failed: ${err2.message}`);
    }
  }

  throw new Error(
    `Transaction still missing or pending after ${(waitTime * waitLimit) / 1000} seconds`,
  );
}

export function isClientError(error: any) {
  if (!(error instanceof RpcError)) throw error;
  if (error.code > -33000) throw error;

  let err2;
  try {
    err2 = new Error2(error.data);
  } catch (_) {
    throw error;
  }
  if (err2.code && err2.code >= 500) {
    throw err2;
  }
  return err2;
}

export async function fetchAccount<
  C extends Ctor<core.Account>,
  A extends Account = InstanceType<C>,
>(api: JsonRpcClient, url: URLArgs, type?: C): Promise<A | null> {
  const r = await api.query(url).catch(isErrorRecord);
  if (isRecordOf(r, Status.NotFound)) {
    // Account does not exist
    return null;
  }

  if (r.recordType === RecordType.Account && (!type || isRecordOf(r, type))) {
    // Account exists and is the specified type
    return r.account as A;
  }

  if (r.recordType === RecordType.Error) {
    // Some other error occurred
    throw new Error(r.value.message);
  }

  // Unknown error
  throw new Error(`An unexpected error occurred while retrieving ${url}`);
}

export async function fetchDataEntries(
  api: JsonRpcClient,
  scope: URLArgs,
  predicate?: (_: DataEntry) => boolean,
) {
  const results: DataEntry[] = [];
  for (let start = 0; ; ) {
    const { records = [], total = 0 } = (await api.query(scope, {
      queryType: 'chain',
      name: 'main',
      range: {
        start,
        expand: true,
      },
    })) as RecordRange<TxnEntry>;

    for (const r of records) {
      if (!isRecordOfDataTxn(r)) {
        continue;
      }
      const { entry } = r.value.message.transaction.body;
      if (!predicate || predicate(entry)) {
        results.push(entry);
      }
    }
    start += records.length;
    if (start >= total) {
      break;
    }
  }
  return results;
}
