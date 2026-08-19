import { describe, expect, it } from 'vitest';

import { FilterRanger, Ranger } from './Ranger';

// Ranger and FilterRanger page lazily over a query and cache what they see.
// The caching loop was copied verbatim into each subclass and untested (#64);
// it now lives in the base, so this exercises it once through both.

/** A source of `total` records, counting the pages it is asked for. */
function source(total: number) {
  const pages: Array<{ start: number; count: number }> = [];
  const query = async ({ start, count }: { start: number; count: number }) => {
    pages.push({ start, count });
    const end = Math.min(start + count, total);
    return {
      start,
      total,
      records: Array.from({ length: Math.max(0, end - start) }, (_, i) => ({
        n: start + i,
      })),
    };
  };
  return { query, pages };
}

describe('Ranger', () => {
  it('returns records by index', async () => {
    const { query } = source(120);
    const r = new Ranger<{ n: number }>(query);
    expect((await r.get(0)).n).toBe(0);
    expect((await r.get(7)).n).toBe(7);
    expect((await r.get(119)).n).toBe(119);
  });

  it('fetches a page only once, and only as far as asked', async () => {
    const { query, pages } = source(500);
    const r = new Ranger<{ n: number }>(query);
    await r.get(0);
    expect(pages).toHaveLength(1);
    // Still inside the first page: no further request.
    await r.get(49);
    expect(pages).toHaveLength(1);
    // Crossing into the second.
    await r.get(50);
    expect(pages).toEqual([
      { start: 0, count: 50 },
      { start: 50, count: 50 },
    ]);
  });

  it('reports the source total', async () => {
    const { query } = source(120);
    const r = new Ranger<{ n: number }>(query);
    await r.get(0);
    expect(r.total).toBe(120);
  });

  it('stops at the end instead of paging forever', async () => {
    const { query, pages } = source(10);
    const r = new Ranger<{ n: number }>(query);
    expect(await r.get(25)).toBeUndefined();
    // One page covered the source; asking beyond it must not keep fetching.
    expect(pages).toHaveLength(1);
  });

  it('serves a range, truncating at the end', async () => {
    const { query } = source(12);
    const r = new Ranger<{ n: number }>(query);
    const page = await r.get({ start: 8, count: 10 });
    expect(page.records.map((x) => x.n)).toEqual([8, 9, 10, 11]);
    expect(page.start).toBe(8);
    expect(page.total).toBe(12);
  });

  it('refuses a from-end range', async () => {
    const { query } = source(10);
    const r = new Ranger<{ n: number }>(query);
    await expect(r.get({ start: 0, count: 5, fromEnd: true })).rejects.toThrow(
      /from end/,
    );
  });
});

describe('FilterRanger', () => {
  it('indexes over the records that survive the filter', async () => {
    const { query } = source(100);
    const r = new FilterRanger<{ n: number }>(query, (x) => x.n % 10 === 0);
    expect((await r.get(0)).n).toBe(0);
    expect((await r.get(3)).n).toBe(30);
  });

  it('keeps paging past a page that matched nothing', async () => {
    const { query, pages } = source(200);
    // Nothing matches until well past the first page.
    const r = new FilterRanger<{ n: number }>(query, (x) => x.n >= 150);
    expect((await r.get(0)).n).toBe(150);
    expect(pages.length).toBeGreaterThan(3);
  });

  it('counts what survived, not what was scanned, once exhausted', async () => {
    const { query } = source(100);
    const r = new FilterRanger<{ n: number }>(query, (x) => x.n % 10 === 0);
    // Walk off the end so the source is exhausted.
    expect(await r.get(99)).toBeUndefined();
    expect(r.total).toBe(10);
  });

  it('reports zero when nothing matches', async () => {
    const { query } = source(60);
    const r = new FilterRanger<{ n: number }>(query, () => false);
    expect(await r.get(0)).toBeUndefined();
    expect(r.total).toBe(0);
  });
});
