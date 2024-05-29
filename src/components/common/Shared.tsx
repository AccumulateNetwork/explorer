import React, { useContext } from 'react';

import { TxID, URLArgs, api_v3, errors, messaging } from 'accumulate.js';
import { ErrorRecord } from 'accumulate.js/lib/api_v3';

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
): Promise<api_v3.AccountRecord | api_v3.MessageRecord | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.ChainQueryArgsWithType, 'queryType'>,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.ChainRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.ChainQueryArgsWithType, 'queryType' | 'name'>,
  dependencies?: any[],
): Promise<api_v3.ChainRecord | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.ChainQueryArgsWithType,
    'queryType' | 'name' | 'index' | 'includeReceipt'
  >,
  dependencies?: any[],
): Promise<api_v3.ChainEntryRecord | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.ChainQueryArgsWithType,
    'queryType' | 'name' | 'entry' | 'includeReceipt'
  >,
  dependencies?: any[],
): Promise<api_v3.ChainEntryRecord | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.ChainQueryArgsWithType,
    'queryType' | 'name' | 'range' | 'includeReceipt'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.ChainEntryRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DataQueryArgsWithType, 'queryType'>,
  dependencies?: any[],
): Promise<
  | api_v3.ChainEntryRecord<api_v3.MessageRecord<messaging.TransactionMessage>>
  | api_v3.ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DataQueryArgsWithType, 'queryType' | 'index'>,
  dependencies?: any[],
): Promise<
  | api_v3.ChainEntryRecord<api_v3.MessageRecord<messaging.TransactionMessage>>
  | api_v3.ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DataQueryArgsWithType, 'queryType' | 'entry'>,
  dependencies?: any[],
): Promise<
  | api_v3.ChainEntryRecord<api_v3.MessageRecord<messaging.TransactionMessage>>
  | api_v3.ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DataQueryArgsWithType, 'queryType' | 'range'>,
  dependencies?: any[],
): Promise<
  | api_v3.RecordRange<
      api_v3.ChainEntryRecord<
        api_v3.MessageRecord<messaging.TransactionMessage>
      >
    >
  | api_v3.ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DirectoryQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand?: false };
  },
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.UrlRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DirectoryQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand: true };
  },
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.AccountRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.PendingQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand?: false };
  },
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.TxIDRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.PendingQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand: true };
  },
  dependencies?: any[],
): Promise<
  | api_v3.RecordRange<api_v3.MessageRecord<messaging.TransactionMessage>>
  | api_v3.ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.BlockQueryArgsWithType,
    'queryType' | 'minor' | 'entryRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): Promise<api_v3.MinorBlockRecord | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.BlockQueryArgsWithType,
    'queryType' | 'major' | 'minorRange' | 'entryRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): Promise<api_v3.MajorBlockRecord | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.BlockQueryArgsWithType,
    'queryType' | 'minorRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.MinorBlockRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.BlockQueryArgsWithType,
    'queryType' | 'majorRange' | 'omitEmpty'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.MajorBlockRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.AnchorSearchQueryArgsWithType,
    'queryType' | 'anchor' | 'includeReceipt'
  >,
  dependencies?: any[],
): Promise<
  api_v3.RecordRange<api_v3.ChainEntryRecord<never>> | api_v3.ErrorRecord
>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.PublicKeySearchQueryArgsWithType,
    'queryType' | 'publicKey' | 'type'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.KeyRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<
    api_v3.PublicKeyHashSearchQueryArgsWithType,
    'queryType' | 'publicKeyHash'
  >,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.KeyRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.DelegateSearchQueryArgsWithType, 'queryType' | 'delegate'>,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.KeyRecord> | api_v3.ErrorRecord>;
export function queryEffect(
  scope: URLArgs,
  query: Pick<api_v3.MessageHashSearchQueryArgsWithType, 'queryType' | 'hash'>,
  dependencies?: any[],
): Promise<api_v3.RecordRange<api_v3.MessageRecord> | api_v3.ErrorRecord>;

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
          if (!scope || !api) {
            return;
          }

          const r = await api.query(scope, query as any).catch((err) => {
            try {
              if (
                typeof err === 'object' &&
                'data' in err &&
                typeof err.data === 'object'
              ) {
                return new ErrorRecord({ value: new errors.Error(err.data) });
              }
            } catch (_) {}
            onApiError(err);
            return null;
          });
          if (!r || !mounted()) {
            return;
          }

          resolve(await effect(r));
        },
        [`${scope}`, JSON.stringify(query), ...(dependencies || [])],
      );

      return promise;
    },
  };
}
