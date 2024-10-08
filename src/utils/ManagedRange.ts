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
  readonly #filter?: (_: T) => boolean;
  readonly #results = new RecordRange<T>({ records: [] });
  #start?: { index: number; total: number };

  constructor(query: QueryFunc<T>, filter?: (_: T) => boolean);
  constructor(query: QueryFunc<T & { index?: number }>, fromEnd: true);
  constructor(
    query: QueryFunc<T>,
    filterOrFromEnd?: boolean | ((_: T) => boolean),
  ) {
    this.#query = query;
    if (typeof filterOrFromEnd === 'boolean') {
      this.#fromEnd = filterOrFromEnd;
    } else if (filterOrFromEnd instanceof Function) {
      this.#fromEnd = false;
      this.#filter = filterOrFromEnd;
    }
  }

  get total() {
    return this.#results.total;
  }

  async getPage({ current = 1, pageSize = 10 }: Page) {
    if (this.#fromEnd) {
      const { total } = await this.#findStart();
      let start = total - current * pageSize;
      let count = pageSize;
      if (start < 0) {
        count = pageSize + start;
        start = 0;
      }
      return this.#query({ start, count });
    }

    const start = (current - 1) * pageSize;
    const records = [];
    for (let i = 0; i < pageSize; i++) {
      const r = await this.#getIndex(start + i);
      if (!r) break;
      records.push(r);
    }
    return new RecordRange<T>({
      start,
      records,
      total: this.#results.total,
    });
  }

  async #getIndex(index: number) {
    // Only used when fromEnd = false
    while (index >= this.#results.records.length) {
      if (
        typeof this.#results.total == 'number' &&
        index >= this.#results.total
      ) {
        return null;
      }
      await this.#getNext();
    }
    return this.#results.records[index];
  }

  async #getNext() {
    // Only used when fromEnd = false
    if (!this.#start) {
      this.#start = { index: 0, total: NaN };
    }

    const r = await this.#query({ start: this.#start.index, count: 50 });
    if (!r.records) {
      r.records = [];
    }

    this.#start.index += r.records.length;
    for (const entry of r.records) {
      if (!this.#filter || this.#filter(entry)) {
        this.#results.records.push(entry);
      }
    }

    if (!this.#filter) {
      this.#results.total = r.total;
    } else if (r.records.length >= r.total || r.records.length == 0) {
      this.#results.total = this.#results.records.length;
    }
  }

  async #findStart() {
    // Only used when fromEnd = true
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
