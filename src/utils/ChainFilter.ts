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
      if (typeof this.#results.total == 'number') {
        return null;
      }
      await this.#getNext();
    }
    return this.#results.records[index];
  }

  async #getNext() {
    const maxCount = 50;
    if (this.#results.records.length == 0) {
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

      for (const entry of r.records.reverse()) {
        if (!this.#filter || this.#filter(entry)) {
          this.#results.records.push(entry);
        }
      }
      if (!this.#filter) {
        this.#results.total = r.total;
      } else if (r.start + r.records.length >= r.total) {
        this.#results.total = this.#results.records.length;
      }
      return;
    }

    const end = this.#results.records[this.#results.records.length - 1].index;
    if (end == 0) {
      this.#results.total = this.#results.records.length;
      return;
    }

    let start = end - maxCount;
    let count = maxCount;
    if (start < 0) {
      start = 0;
      count = end;
    }

    const { records } = (await this.#api.query(
      this.#scope,
      this.#makeQuery({
        start,
        count,
        fromEnd: true,
        expand: true,
      }),
    )) as unknown as RecordRange<R>;

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
