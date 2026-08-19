import React from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine } from 'react-icons/ri';

import { MessageRecord, TxIDRecord } from 'accumulate.js/lib/api_v3';
import { Buffer } from 'accumulate.js/lib/common';

import {
  extractPrincipal,
  extractTxType,
  formatTypeName,
} from '../../utils/message';
import { useInfiniteListEnrichment } from '../common/InfiniteList';
import { Link } from '../common/Link';
import { Status } from './Status';

export type TxEnrichment = {
  type?: string;
  principal?: string;
  /** The looked-up record, so the status does not have to be fetched again. */
  record?: MessageRecord;
};

export function txidKey(record: TxIDRecord): string {
  return record.value.toString();
}

/**
 * Look up what each referenced transaction actually is, so cause/produced
 * rows can name it instead of showing a bare hash.
 */
export async function enrichTxIdRecords(
  api: { call: (_: unknown[]) => Promise<any[]> },
  items: TxIDRecord[],
): Promise<ReadonlyMap<string, TxEnrichment>> {
  const map = new Map<string, TxEnrichment>();
  if (!items.length) {
    return map;
  }

  // One batched call rather than a query per row. A page of 25 produced
  // messages issued 25 requests here, and 25 more from the Status beside
  // each row asking about the same ids (#50).
  let results: any[] = [];
  try {
    results = await api.call(
      items.map((it) => ({
        method: 'query',
        params: {
          scope: it.value.toString(),
          query: { queryType: 'default' },
        },
      })),
    );
  } catch (e) {
    // Rows fall back to a short hash, as before.

    console.warn('Related-txn enrichment failed:', (e as Error)?.message);
    items.forEach((it) => map.set(txidKey(it), {}));
    return map;
  }

  items.forEach((it, i) => {
    const raw = results[i];
    // The batch returns plain JSON, not hydrated records — recordType comes
    // back as 'message' rather than the enum, so Status would not recognise
    // it. Hydrate messages; leave anything else (errors, pending) undefined
    // so Status falls back to querying it itself.
    const record =
      raw && raw.recordType === 'message'
        ? new MessageRecord(raw as never)
        : undefined;
    map.set(txidKey(it), {
      type: extractTxType(record),
      principal: extractPrincipal(record),
      record,
    });
  });
  return map;
}

/**
 * The status of a related transaction, taken from the enrichment when the
 * batch already fetched it rather than querying the same id a second time.
 */
export function RelatedTxnStatus({ record }: { record: TxIDRecord }) {
  const enrichment = useInfiniteListEnrichment<string, TxEnrichment>();
  const data = enrichment?.get(txidKey(record));
  return data?.record ? (
    <Status record={data.record} />
  ) : (
    <Status id={record.value} />
  );
}

/**
 * One row of a cause/produced list: what the referenced transaction is and
 * which account it acts on. Falls back to a short hash only when the lookup
 * gave us nothing to say.
 */
/**
 * Memoized: one of these renders per row of a cause/produced list, and the
 * enrichment map arrives after the rows mount, so every row re-rendered on
 * each parent render (#56).
 */
export const RelatedTxn = React.memo(function RelatedTxn({
  record,
}: {
  record: TxIDRecord;
}) {
  const enrichment = useInfiniteListEnrichment<string, TxEnrichment>();
  const data = enrichment?.get(txidKey(record));
  const id = txidKey(record);
  const shortHash = Buffer.from(record.value.hash).toString('hex').slice(0, 8);
  const type = data?.type ? formatTypeName(data.type) : 'Unknown';
  const principal = data?.principal;
  return (
    <Link to={record.value}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiExchangeLine />
      </IconContext.Provider>
      <span title={id}>
        {type} · {principal || shortHash}
      </span>
    </Link>
  );
});
