import { URLArgs } from 'accumulate.js';
import {
  JsonRpcClient,
  Query,
  QueryArgs,
  RangeOptions,
  RangeOptionsArgs,
  Record,
  RecordRange,
} from 'accumulate.js/lib/api_v3';

type QueryFunc<R> = (range: Range) => Promise<R>;
type Range = { start: number; count: number };
type ResultSet<R> = { records?: R[]; start?: number; total?: number };

abstract class RangerBase<R> {
  abstract get total(): number;

  get(index: number): Promise<R>;
  get(range: RangeOptions | RangeOptionsArgs): Promise<ResultSet<R>>;
  async get(
    request: number | RangeOptions | RangeOptionsArgs,
  ): Promise<R | ResultSet<R>> {
    if (typeof request === 'number') {
      return this._get(request);
    }

    if (!(request instanceof RangeOptions)) {
      request = new RangeOptions(request);
    }
    if (request.fromEnd) {
      throw new Error('from end not supported');
    }

    const records: R[] = [];
    for (let i = 0; i < request.count; i++) {
      const r = await this._get(request.start + i);
      if (!r) break;
      records.push(r);
    }
    return {
      start: request.start,
      records,
      total: this.total,
    };
  }

  protected abstract _get(index: number);
}

export class Ranger<R> extends RangerBase<R> {
  readonly #query: QueryFunc<ResultSet<R>>;
  readonly #results: R[] = [];
  #start = 0;
  #total?: number;

  constructor(query: QueryFunc<ResultSet<R>>) {
    super();
    this.#query = query;
  }

  get total() {
    return this.#total;
  }

  protected async _get(index: number) {
    while (
      index >= this.#results.length &&
      (typeof this.#total !== 'number' || index < this.#total)
    ) {
      const start = this.#start;
      const count = 50;
      this.#start += count;
      await this.#get({ start, count });
    }
    return this.#results[index];
  }

  async #get(range: Range) {
    const r = await this.#query(range);
    if (!r.records) r.records = [];
    this.#results.push(...r.records);

    if (r.total) {
      this.#total = r.total;
    } else if (r.total <= r.start + r.records.length) {
      this.#total = this.#results.length;
    }
  }
}

export class FilterRanger<R> extends RangerBase<R> {
  readonly #query: QueryFunc<ResultSet<R>>;
  readonly #filter: (r: R) => boolean;
  readonly #results: R[] = [];
  #start = 0;
  #total?: number;

  constructor(query: QueryFunc<ResultSet<R>>, filter: (r: R) => boolean) {
    super();
    this.#query = query;
    this.#filter = filter;
  }

  get total() {
    return this.#total;
  }

  protected async _get(index: number) {
    while (
      index >= this.#results.length &&
      (typeof this.#total !== 'number' || index < this.#total)
    ) {
      const start = this.#start;
      const count = 50;
      this.#start += count;
      await this.#get({ start, count });
    }
    return this.#results[index];
  }

  async #get({ start, count }: Range) {
    const r = await this.#query({ start, count });
    if (!r.records) r.records = [];
    this.#results.push(...r.records.filter((r) => this.#filter(r)));

    if (r.total <= r.start + r.records.length) {
      this.#total = this.#results.length;
    }
  }
}

export class ReverseRanger<R> extends RangerBase<R> {
  readonly #query: QueryFunc<ResultSet<R>>;
  readonly #srcTotal?: Promise<number>;
  readonly #results: R[] = [];
  #start = 0;
  #total?: number;

  constructor(query: QueryFunc<ResultSet<R>>) {
    super();
    this.#query = query;
    this.#srcTotal = query({ start: 0, count: 1 }).then((r) => {
      if (typeof r.total !== 'number') {
        // TODO: Query the entire underlying data set to get the total?
        throw new Error(
          'Cannot reverse-range a data set that does not provide total',
        );
      }
      return r.total;
    });
  }

  get total() {
    return this.#total;
  }

  protected async _get(index: number) {
    while (
      index >= this.#results.length &&
      (typeof this.#total !== 'number' || index < this.#total)
    ) {
      const start = this.#start;
      const count = 50;
      this.#start += count;
      await this.#get({ start, count });
    }
    return this.#results[index];
  }

  async #get({ start, count }: Range) {
    const end = (await this.#srcTotal) - start;
    start = end - count;
    if (start < 0) {
      start = 0;
      count = end;
    }

    const r = await this.#query({ start, count });
    if (!r.records) r.records = [];
    this.#results.push(...r.records.reverse());

    if (r.total) {
      this.#total = r.total;
    } else if (!r.records.length) {
      this.#total = this.#results.length;
    }
    return r;
  }
}

export function apiQuery<R extends Record>(
  api: JsonRpcClient,
  scope: URLArgs,
  query: QueryArgs,
): (range: RangeOptionsArgs) => Promise<RecordRange<R>> {
  return (range) =>
    api.query(scope, makeQuery(query, range)) as unknown as Promise<
      RecordRange<R>
    >;

  function makeQuery(base: QueryArgs, range: RangeOptionsArgs): any {
    // Make a copy of the original arguments
    const query = Query.fromObject(base).copy();

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
