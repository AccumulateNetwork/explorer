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

export type TxEnrichment = { type?: string; principal?: string };

export function txidKey(record: TxIDRecord): string {
  return record.value.toString();
}

/**
 * Look up what each referenced transaction actually is, so cause/produced
 * rows can name it instead of showing a bare hash.
 */
export async function enrichTxIdRecords(
  api: { query: (id: any) => Promise<any> },
  items: TxIDRecord[],
): Promise<ReadonlyMap<string, TxEnrichment>> {
  const map = new Map<string, TxEnrichment>();
  await Promise.all(
    items.map(async (it) => {
      const key = txidKey(it);
      try {
        const r = (await api.query(it.value)) as MessageRecord | undefined;
        map.set(key, {
          type: extractTxType(r),
          principal: extractPrincipal(r),
        });
      } catch {
        map.set(key, {});
      }
    }),
  );
  return map;
}

/**
 * One row of a cause/produced list: what the referenced transaction is and
 * which account it acts on. Falls back to a short hash only when the lookup
 * gave us nothing to say.
 */
export function RelatedTxn({ record }: { record: TxIDRecord }) {
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
}
