import { TxID, TxIDArgs, URLArgs, api_v3, messaging } from 'accumulate.js';
import React, { useContext } from 'react';

import { useAsyncEffect } from './useAsync';

interface Context {
  api?: api_v3.JsonRpcClient;
  onApiError: (_: any) => void;
}

export const Shared = React.createContext<Context>({
  onApiError(error) {
    console.error(error);
  },
});

export function queryEffect(
  scope: URLArgs | TxID,
  query?: api_v3.DefaultQueryArgsWithType,
  dependencies?: any[],
): Promise<api_v3.AccountRecord | api_v3.MessageRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.ChainQueryArgsWithType, 'queryType'>,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.ChainRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.ChainQueryArgsWithType, 'queryType' | 'name'>,
  dependencies?: any[],
): Promise<api_v3.ChainRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.ChainQueryArgsWithType,
    'queryType' | 'name' | 'index' | 'includeReceipt'
  >,
  dependencies?: any[],
): Promise<api_v3.ChainEntryRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.ChainQueryArgsWithType,
    'queryType' | 'name' | 'entry' | 'includeReceipt'
  >,
  dependencies?: any[],
): Promise<api_v3.ChainEntryRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.ChainQueryArgsWithType,
    'queryType' | 'name' | 'range' | 'includeReceipt'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.ChainEntryRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DataQueryArgsWithType, 'queryType'>,
  dependencies?: any[],
): Promise<
  api_v3.ChainEntryRecord<api_v3.MessageRecord<messaging.TransactionMessage>>
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DataQueryArgsWithType, 'queryType' | 'index'>,
  dependencies?: any[],
): Promise<
  api_v3.ChainEntryRecord<api_v3.MessageRecord<messaging.TransactionMessage>>
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DataQueryArgsWithType, 'queryType' | 'entry'>,
  dependencies?: any[],
): Promise<
  api_v3.ChainEntryRecord<api_v3.MessageRecord<messaging.TransactionMessage>>
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DataQueryArgsWithType, 'queryType' | 'range'>,
  dependencies?: any[],
): Promise<
  api_v3.RecordRange<
    api_v3.ChainEntryRecord<api_v3.MessageRecord<messaging.TransactionMessage>>
  >
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DirectoryQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand?: false };
  },
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.UrlRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DirectoryQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand: true };
  },
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.AccountRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.PendingQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand?: false };
  },
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.TxIDRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.PendingQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand: true };
  },
  dependencies?: any[],
): Promise<
  api_v3.RecordRange<api_v3.MessageRecord<messaging.TransactionMessage>>
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.BlockQueryArgsWithType,
    'queryType' | 'minor' | 'entryRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): Promise<api_v3.MinorBlockRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.BlockQueryArgsWithType,
    'queryType' | 'major' | 'minorRange' | 'entryRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): Promise<api_v3.MajorBlockRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.BlockQueryArgsWithType,
    'queryType' | 'minorRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.MinorBlockRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.BlockQueryArgsWithType,
    'queryType' | 'majorRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.MajorBlockRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.AnchorSearchQueryArgsWithType,
    'queryType' | 'anchor' | 'includeReceipt'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.ChainEntryRecord<never>>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.PublicKeySearchQueryArgsWithType,
    'queryType' | 'publicKey' | 'type'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.KeyRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.PublicKeyHashSearchQueryArgsWithType,
    'queryType' | 'publicKeyHash'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.KeyRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DelegateSearchQueryArgsWithType, 'queryType' | 'delegate'>,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.KeyRecord>>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.MessageHashSearchQueryArgsWithType, 'queryType' | 'hash'>,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.MessageRecord>>;

export function queryEffect(
  scope: URLArgs | TxID,
  query: api_v3.QueryArgs,
  dependencies?: any[],
): PromiseLike<api_v3.Record> {
  const { api, onApiError } = useContext(Shared);
  return {
    then<T1>(effect?: (r: api_v3.Record) => T1 | PromiseLike<T1>) {
      let resolve: (_: T1) => void;
      let promise = new Promise<T1>((r) => (resolve = r));

      useAsyncEffect(
        async (mounted) => {
          if (!api) {
            return;
          }

          const r = await api.query(scope, query as any);
          if (!mounted()) {
            return;
          }

          resolve(await effect(r));
        },
        [scope.toString(), JSON.stringify(query), ...(dependencies || [])],
      ).catch(onApiError);

      return promise;
    },
  };
}
