import { URL, URLArgs } from 'accumulate.js';
import {
  JsonRpcClient,
  Query,
  QueryArgs,
  RangeOptions,
  RangeOptionsArgs,
  Record,
  RecordRange,
} from 'accumulate.js/lib/api_v3';

export class ChainFilter<R extends Record & { index?: number }> {
  readonly #scope: URL;
  readonly #query: Query;
  readonly #api: JsonRpcClient;
  readonly #filter?: (r: R) => boolean;
  readonly #results = new RecordRange<R>({ records: [] });

  // Lowest chain index scanned so far, or undefined before the first fetch.
  // Progress must be tracked independently of #results: a page may contribute
  // zero matching entries, and deriving the next page from the last *kept*
  // entry's index would refetch the same page forever (#41).
  #low?: number;

  constructor(
    api: JsonRpcClient,
    scope: URLArgs,
    query: QueryArgs,
    filter?: (r: R) => boolean,
  ) {
    this.#scope = URL.parse(scope);
    this.#query = Query.fromObject(query);
    this.#api = api;
    this.#filter = filter;
  }

  get total() {
    return this.#results.total;
  }

  async getRange(range: RangeOptions | RangeOptionsArgs) {
    if (!(range instanceof RangeOptions)) {
      range = new RangeOptions(range);
    }
    if (range.fromEnd) {
      throw new Error('from end not supported');
    }

    const records = [];
    for (let i = 0; i < range.count; i++) {
      const r = await this.getIndex(range.start + i);
      if (!r) break;
      records.push(r);
    }
    return new RecordRange<R>({
      start: range.start,
      records,
      total: this.#results.total,
    });
  }

  async getIndex(index: number) {
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
    const maxCount = 50;
    if (this.#low === undefined) {
      const r = (await this.#api.query(
        this.#scope,
        this.#makeQuery({
          start: 0,
          count: maxCount,
          fromEnd: true,
        }),
      )) as unknown as RecordRange<R>;
      if (!r.total) {
        this.#results.total = 0;
        return;
      }
      if (!r.records) {
        r.records = [];
      }

      // The API answers a fromEnd range with start = total - count, so this
      // page covers [r.start, total). Recording r.start (not the kept-entry
      // count) is what makes the whole-chain test below correct: the previous
      // condition, r.start + r.records.length >= r.total, is satisfied by
      // *every* fromEnd page, which fixed the filtered total to the matches
      // within the newest 50 entries and made older entries unreachable (#41).
      this.#low = r.start;
      for (const entry of r.records.reverse()) {
        if (!this.#filter || this.#filter(entry)) {
          this.#results.records.push(entry);
        }
      }
      if (!this.#filter) {
        this.#results.total = r.total;
      } else if (this.#low == 0) {
        this.#results.total = this.#results.records.length;
      }
      return;
    }

    if (this.#low == 0) {
      this.#results.total = this.#results.records.length;
      return;
    }

    let start = this.#low - maxCount;
    let count = maxCount;
    if (start < 0) {
      start = 0;
      count = this.#low;
    }

    const { records } = (await this.#api.query(
      this.#scope,
      this.#makeQuery({
        start,
        count,
        fromEnd: false,
        expand: true,
      }),
    )) as unknown as RecordRange<R>;

    this.#low = start;
    for (const r of records.reverse()) {
      if (!this.#filter || this.#filter(r)) {
        this.#results.records.push(r);
      }
    }
    if (start == 0) {
      this.#results.total = this.#results.records.length;
    }
  }

  #makeQuery(range: RangeOptionsArgs): any {
    // Make a copy of the original arguments
    const query = this.#query.copy();

    // Find a property that is a range and modify it
    for (const prop in query) {
      if (query[prop] instanceof RangeOptions) {
        query[prop] = new RangeOptions({
          ...query[prop],
          ...range,
        });
        return query;
      }
    }

    // If no range property is found, use 'range'
    return Query.fromObject({
      ...query.asObject(),
      range,
    } as any);
  }
}
