import { TablePaginationConfig } from 'antd';

import {
  RangeOptionsArgs,
  Record,
  RecordRange,
} from 'accumulate.js/lib/api_v3';

/**
 * Page is a subset of TablePaginationConfig from Ant Design.
 */
interface Page {
  current?: number;
  pageSize?: number;
}

type QueryFunc<T extends Record> = (
  range: RangeOptionsArgs,
) => Promise<RecordRange<T>>;

export class ManagedRange<T extends Record> {
  readonly #fromEnd: boolean;
  readonly #query: QueryFunc<T>;
  #start?: { index: number; total: number };

  constructor(query: QueryFunc<T>);
  constructor(query: QueryFunc<T & { index?: number }>, fromEnd: true);
  constructor(query: QueryFunc<T>, fromEnd = false) {
    this.#query = query;
    this.#fromEnd = fromEnd;
  }

  async getPage({ current = 1, pageSize = 10 }: Page) {
    if (!this.#fromEnd) {
      return this.#query({
        start: (current - 1) * pageSize,
        count: pageSize,
      });
    }

    const { total } = await this.#findStart();
    let start = total - current * pageSize;
    let count = pageSize;
    if (start < 0) {
      count = pageSize + start;
      start = 0;
    }
    return this.#query({ start, count });
  }

  async #findStart() {
    if (this.#start) {
      return this.#start;
    }

    this.#start = await findStart(this.#query, this.#fromEnd);
    return this.#start;
  }
}

async function findStart<T extends Record>(
  query: QueryFunc<T>,
  fromEnd: boolean,
) {
  const r = await query({
    start: 0,
    count: 1,
    fromEnd,
    expand: false,
  });
  if (!r.total) {
    return { index: 0, total: 0 };
  }
  if ('index' in r.records[0] && typeof r.records[0].index === 'number') {
    return {
      index: r.records[0].index,
      total: r.total,
    };
  }
  if (fromEnd) {
    throw new Error(
      'requested range from end but response does not include index',
    );
  }
  return {
    index: 0,
    total: r.total,
  };
}
