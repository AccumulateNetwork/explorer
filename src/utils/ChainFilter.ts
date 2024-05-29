import { URL } from 'accumulate.js';
import {
  ChainEntryRecord,
  JsonRpcClient,
  RangeOptions,
  RangeOptionsArgs,
  Record,
  RecordRange,
} from 'accumulate.js/lib/api_v3';

type Opts = {
  // fromEnd?: boolean;
};

export class ChainFilter<R extends Record> {
  readonly #scope: URL;
  readonly #chain: string;
  readonly #opts: Opts;
  readonly #api: JsonRpcClient;
  readonly #filter: (r: ChainEntryRecord<R>) => boolean;
  readonly #results = new RecordRange<ChainEntryRecord<R>>({ records: [] });

  constructor(
    api: JsonRpcClient,
    scope: URL,
    chain: string,
    opts: Opts,
    filter: (r: ChainEntryRecord<R>) => boolean,
  ) {
    this.#scope = scope;
    this.#chain = chain;
    this.#opts = opts;
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
    return new RecordRange<ChainEntryRecord<R>>({
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
      const r = (await this.#api.query(this.#scope, {
        queryType: 'chain',
        name: this.#chain,
        range: {
          start: 0,
          count: maxCount,
          fromEnd: true,
          expand: true,
        },
      })) as RecordRange<ChainEntryRecord<R>>;
      if (!r.records) {
        r.records = [];
      }

      for (const entry of r.records.reverse()) {
        if (this.#filter(entry)) {
          this.#results.records.push(entry);
        }
      }
      if (r.records.length < maxCount) {
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

    const { records } = (await this.#api.query(this.#scope, {
      queryType: 'chain',
      name: 'main',
      range: {
        start,
        count,
        expand: true,
      },
    })) as RecordRange<ChainEntryRecord<R>>;

    for (const r of records.reverse()) {
      if (this.#filter(r)) {
        this.#results.records.push(r);
      }
    }
    if (start == 0) {
      this.#results.total = this.#results.records.length;
    }
  }
}
