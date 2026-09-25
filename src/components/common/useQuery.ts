import { DependencyList, useContext, useEffect, useRef, useState } from 'react';

import { TxID, URLArgs, messaging } from 'accumulate.js';
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
  TxIDRecord,
  UrlRecord,
} from 'accumulate.js/lib/api_v3';

import { Network } from './Network';
import { isErrorRecord } from './query';
import { queryCache, queryKey } from './queryCache';

/**
 * The state of one query.
 *
 * `data` carries whatever the node returned, including an `ErrorRecord` — a
 * 404 for an account that does not exist is a normal answer that pages render
 * as a "not found" state, not a failure. `error` is for the query failing
 * outright: no network, a malformed response, a bug.
 */
export interface QueryResult<T extends Record> {
  data?: T;
  error?: unknown;
  loading: boolean;
}

export function useQuery(
  scope: URLArgs | TxID,
  query?: DefaultQueryArgsWithType,
  dependencies?: DependencyList,
): QueryResult<AccountRecord | MessageRecord | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<ChainQueryArgsWithType, 'queryType'>,
  dependencies?: DependencyList,
): QueryResult<RecordRange<ChainRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<ChainQueryArgsWithType, 'queryType' | 'name'>,
  dependencies?: DependencyList,
): QueryResult<ChainRecord | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<
    ChainQueryArgsWithType,
    'queryType' | 'name' | 'index' | 'includeReceipt'
  >,
  dependencies?: DependencyList,
): QueryResult<ChainEntryRecord | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<
    ChainQueryArgsWithType,
    'queryType' | 'name' | 'entry' | 'includeReceipt'
  >,
  dependencies?: DependencyList,
): QueryResult<ChainEntryRecord | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<
    ChainQueryArgsWithType,
    'queryType' | 'name' | 'range' | 'includeReceipt'
  >,
  dependencies?: DependencyList,
): QueryResult<RecordRange<ChainEntryRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<DataQueryArgsWithType, 'queryType'>,
  dependencies?: DependencyList,
): QueryResult<
  ChainEntryRecord<MessageRecord<messaging.TransactionMessage>> | ErrorRecord
>;
export function useQuery(
  scope: URLArgs,
  query: Pick<DataQueryArgsWithType, 'queryType' | 'index'>,
  dependencies?: DependencyList,
): QueryResult<
  ChainEntryRecord<MessageRecord<messaging.TransactionMessage>> | ErrorRecord
>;
export function useQuery(
  scope: URLArgs,
  query: Pick<DataQueryArgsWithType, 'queryType' | 'entry'>,
  dependencies?: DependencyList,
): QueryResult<
  ChainEntryRecord<MessageRecord<messaging.TransactionMessage>> | ErrorRecord
>;
export function useQuery(
  scope: URLArgs,
  query: Pick<DataQueryArgsWithType, 'queryType' | 'range'>,
  dependencies?: DependencyList,
): QueryResult<
  | RecordRange<ChainEntryRecord<MessageRecord<messaging.TransactionMessage>>>
  | ErrorRecord
>;
export function useQuery(
  scope: URLArgs,
  query: Pick<DirectoryQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand?: false };
  },
  dependencies?: DependencyList,
): QueryResult<RecordRange<UrlRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<DirectoryQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand: true };
  },
  dependencies?: DependencyList,
): QueryResult<RecordRange<AccountRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<PendingQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand?: false };
  },
  dependencies?: DependencyList,
): QueryResult<RecordRange<TxIDRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<PendingQueryArgsWithType, 'queryType' | 'range'> & {
    range: { expand: true };
  },
  dependencies?: DependencyList,
): QueryResult<
  RecordRange<MessageRecord<messaging.TransactionMessage>> | ErrorRecord
>;
export function useQuery(
  scope: URLArgs,
  query: Pick<
    BlockQueryArgsWithType,
    'queryType' | 'minor' | 'entryRange' | 'omitEmpty'
  >,
  dependencies?: DependencyList,
): QueryResult<MinorBlockRecord | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<
    BlockQueryArgsWithType,
    'queryType' | 'major' | 'minorRange' | 'entryRange' | 'omitEmpty'
  >,
  dependencies?: DependencyList,
): QueryResult<MajorBlockRecord | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<BlockQueryArgsWithType, 'queryType' | 'minorRange' | 'omitEmpty'>,
  dependencies?: DependencyList,
): QueryResult<RecordRange<MinorBlockRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<BlockQueryArgsWithType, 'queryType' | 'majorRange' | 'omitEmpty'>,
  dependencies?: DependencyList,
): QueryResult<RecordRange<MajorBlockRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<
    AnchorSearchQueryArgsWithType,
    'queryType' | 'anchor' | 'includeReceipt'
  >,
  dependencies?: DependencyList,
): QueryResult<RecordRange<ChainEntryRecord<never>> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<
    PublicKeySearchQueryArgsWithType,
    'queryType' | 'publicKey' | 'type'
  >,
  dependencies?: DependencyList,
): QueryResult<RecordRange<KeyRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<
    PublicKeyHashSearchQueryArgsWithType,
    'queryType' | 'publicKeyHash'
  >,
  dependencies?: DependencyList,
): QueryResult<RecordRange<KeyRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<DelegateSearchQueryArgsWithType, 'queryType' | 'delegate'>,
  dependencies?: DependencyList,
): QueryResult<RecordRange<KeyRecord> | ErrorRecord>;
export function useQuery(
  scope: URLArgs,
  query: Pick<MessageHashSearchQueryArgsWithType, 'queryType' | 'hash'>,
  dependencies?: DependencyList,
): QueryResult<RecordRange<MessageRecord> | ErrorRecord>;

/**
 * Query the API for `scope`, re-running when the network, the scope, the
 * query, or `dependencies` change.
 *
 * Replaces `queryEffect`, which was a hook that did not look like one: it
 * returned a structural thenable whose `.then()` called `useEffect`, so hook
 * ordering depended on every caller invoking `.then` exactly once,
 * unconditionally, at the top level. Nothing enforced that, `await`ing the
 * result would have called a hook outside render, and `.then` meant a hook on
 * one object and an ordinary callback on the next. Errors thrown inside those
 * callbacks became unhandled rejections — 11 of the 12 call sites registered
 * no reject handler (#63).
 *
 * Requests are de-duplicated and briefly cached; see `queryCache`.
 */
export function useQuery(
  scope: URLArgs | TxID,
  query?: QueryArgs,
  dependencies: DependencyList = [],
): QueryResult<Record> {
  const { api, network, onApiError } = useContext(Network);

  // Not derivable from render: it must survive until the effect resolves, and
  // must not make the effect re-run.
  const onApiErrorRef = useRef(onApiError);
  onApiErrorRef.current = onApiError;

  const enabled = !!scope && !!api;
  const [state, setState] = useState<QueryResult<Record>>({
    loading: enabled,
  });

  const scopeKey = `${scope}`;
  const queryKeyText = query === undefined ? '' : JSON.stringify(query);

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false });
      return;
    }

    let live = true;
    // Drop the previous answer rather than keeping it visible while the new
    // one loads. The effect only re-runs when the network, scope, query or a
    // caller dependency changed, so what is held is an answer to a different
    // question — showing it is how components came to display the previously
    // viewed account (#46).
    setState({ loading: true });

    const key = queryKey(`${network?.id}`, scopeKey, query);
    queryCache
      .fetch(key, () =>
        // An API error is a record, not a failure: the node answering "no
        // such account" is a normal outcome the page renders.
        (query === undefined
          ? api.query(scope)
          : api.query(scope, query)
        ).catch(isErrorRecord),
      )
      .then(
        (data) => {
          if (live) {
            setState({ data: data as Record, loading: false });
          }
        },
        (error) => {
          // Reported even if this component has gone, so a broken network
          // still surfaces once; the state update is guarded.
          onApiErrorRef.current(error);
          if (live) {
            setState({ error, loading: false });
          }
        },
      );

    return () => {
      live = false;
    };
    // `scope` and `query` are covered by their serialized forms; including the
    // objects themselves would re-run on every render, since callers build
    // them inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, network?.id, scopeKey, queryKeyText, ...dependencies]);

  return state;
}
