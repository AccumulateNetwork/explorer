import { URL } from 'accumulate.js';
import {
  ChainEntryRecord,
  JsonRpcClient,
  RangeOptions,
  RangeOptionsArgs,
  RecordRange,
} from 'accumulate.js/lib/api_v3';

import { ChainFilter } from './ChainFilter';
import { TxnRecord, isRecordOfDataTxn } from './types';

export class DataChain {
  readonly #main: ChainFilter<TxnRecord>;
  readonly #scratch: ChainFilter<TxnRecord>;
  readonly #results = new RecordRange<ChainEntryRecord<TxnRecord>>({
    records: [],
  });
  readonly #start = { main: 0, scratch: 0 };

  constructor(scope: URL, api: JsonRpcClient) {
    this.#main = new ChainFilter(api, scope, 'main', {}, (r) =>
      isRecordOfDataTxn(r),
    );
    this.#scratch = new ChainFilter(api, scope, 'scratch', {}, (r) => {
      return isRecordOfDataTxn(r);
    });
  }

  get total() {
    const { total: t1 } = this.#main;
    const { total: t2 } = this.#scratch;
    if (typeof t1 === 'number' && typeof t2 === 'number') {
      return t1 + t2;
    }
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
    return new RecordRange<ChainEntryRecord<TxnRecord>>({
      start: range.start,
      records,
      total: this.total,
    });
  }

  async getIndex(index: number) {
    while (index >= this.#results.records.length) {
      if (typeof this.total == 'number') {
        return null;
      }
      await this.#getNext();
    }
    return this.#results.records[index];
  }

  async #getNext() {
    const count = 50;
    const [{ records: main }, { records: scratch }] = await Promise.all([
      this.#main.getRange({ start: this.#start.main, count }),
      this.#scratch.getRange({ start: this.#start.scratch, count }),
    ]);
    this.#start.main += count;
    this.#start.scratch += count;

    // TODO: figure out a way to prevent weird order changing issues
    this.#results.records.push(...main, ...scratch);
    const seen = new Set();
    this.#results.records = this.#results.records.filter((x) => {
      const h = Buffer.from(x.value.id.hash).toString('hex');
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    });
    this.#results.records.sort((a, b) => {
      return b.value.received - a.value.received;
    });
  }
}
