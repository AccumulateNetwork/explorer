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

/**
 * Lazy paging over a query, caching what it has seen.
 *
 * The caching loop, the fields it walks and the `total` getter lived in each
 * subclass, copied verbatim (#64). They belong here; a subclass now says only
 * how to absorb a fetched page, which is the one thing they actually differ
 * on — whether records are filtered, and what `total` then means.
 */
abstract class RangerBase<R> {
  protected readonly results: R[] = [];
  protected pageStart = 0;
  protected knownTotal?: number;

  /** How many records this range holds, or undefined until known. */
  get total(): number | undefined {
    return this.knownTotal;
  }

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

  /** Page size. Fifty is what every subclass used. */
  protected static readonly PAGE = 50;

  protected async _get(index: number): Promise<R> {
    while (
      index >= this.results.length &&
      (typeof this.knownTotal !== 'number' || index < this.knownTotal)
    ) {
      const start = this.pageStart;
      this.pageStart += RangerBase.PAGE;
      await this.absorb({ start, count: RangerBase.PAGE });
    }
    return this.results[index];
  }

  /** Fetch one page and fold it into `results`, updating `knownTotal`. */
  protected abstract absorb(range: Range): Promise<void>;
}

export class Ranger<R> extends RangerBase<R> {
  readonly #query: QueryFunc<ResultSet<R>>;

  constructor(query: QueryFunc<ResultSet<R>>) {
    super();
    this.#query = query;
  }

  protected async absorb(range: Range) {
    const r = await this.#query(range);
    if (!r.records) r.records = [];
    this.results.push(...r.records);

    // Unfiltered, so the source's total is the total.
    if (r.total) {
      this.knownTotal = r.total;
    } else if (r.total <= r.start + r.records.length) {
      this.knownTotal = this.results.length;
    }
  }
}

export class FilterRanger<R> extends RangerBase<R> {
  readonly #query: QueryFunc<ResultSet<R>>;
  readonly #filter: (r: R) => boolean;

  constructor(query: QueryFunc<ResultSet<R>>, filter: (r: R) => boolean) {
    super();
    this.#query = query;
    this.#filter = filter;
  }

  protected async absorb({ start, count }: Range) {
    const r = await this.#query({ start, count });
    if (!r.records) r.records = [];
    this.results.push(...r.records.filter((x) => this.#filter(x)));

    // Filtered, so the total is only known once the source is exhausted, and
    // it counts what survived rather than what was scanned.
    if (r.total <= r.start + r.records.length) {
      this.knownTotal = this.results.length;
    }
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
