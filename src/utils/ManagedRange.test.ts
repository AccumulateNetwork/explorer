import { describe, expect, it } from 'vitest';

import { ManagedRange } from './ManagedRange';

// ManagedRange turns page numbers into API ranges. Chain uses it for every
// transaction table, and the from-end arithmetic is what makes those tables
// read newest-first — get it wrong and rows silently shift or repeat. It takes
// an injectable query, so the arithmetic is testable without a network.

/**
 * A chain of `total` entries whose index is their position, recording every
 * range it is asked for.
 */
function chain(total: number) {
  const asked: Array<{ start: number; count: number; fromEnd?: boolean }> = [];
  const query = async (range: any) => {
    asked.push({ ...range });
    let start = range.start;
    if (range.fromEnd) {
      start = Math.max(0, total - range.count);
    }
    const count = Math.max(0, Math.min(range.count, total - start));
    return {
      start,
      total,
      records: Array.from({ length: count }, (_, i) => ({ index: start + i })),
    } as any;
  };
  return { query, asked };
}

describe('ManagedRange, counting from the start', () => {
  it('maps page numbers onto offsets', async () => {
    const { query, asked } = chain(200);
    const r = new ManagedRange<any>(query);
    await r.getPage({ current: 1, pageSize: 25 });
    await r.getPage({ current: 3, pageSize: 25 });
    expect(asked).toEqual([
      { start: 0, count: 25 },
      { start: 50, count: 25 },
    ]);
  });

  it('returns the records for the page asked for', async () => {
    const { query } = chain(200);
    const r = new ManagedRange<any>(query);
    const page = await r.getPage({ current: 2, pageSize: 10 });
    expect(page.records.map((x: any) => x.index)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
  });
});

describe('ManagedRange, counting from the end', () => {
  it('serves the newest entries first', async () => {
    const { query } = chain(112);
    const r = new ManagedRange<any>(query, true);
    const page = await r.getPage({ current: 1, pageSize: 25 });
    // Page one from the end is the last 25 entries: 87..111.
    expect(page.records[0].index).toBe(87);
    expect(page.records[page.records.length - 1].index).toBe(111);
  });

  it('walks backwards page by page', async () => {
    const { query } = chain(112);
    const r = new ManagedRange<any>(query, true);
    const second = await r.getPage({ current: 2, pageSize: 25 });
    expect(second.records[0].index).toBe(62);
    expect(second.records[second.records.length - 1].index).toBe(86);
  });

  it('clamps the last page instead of asking for a negative offset', async () => {
    const { query, asked } = chain(112);
    const r = new ManagedRange<any>(query, true);
    // Page five from the end starts before zero: 112 - 125 = -13.
    const page = await r.getPage({ current: 5, pageSize: 25 });
    const real = asked.filter((a) => !a.fromEnd);
    expect(real[real.length - 1]).toEqual({ start: 0, count: 12 });
    expect(page.records.map((x: any) => x.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  it('probes for the total once and reuses it', async () => {
    const { query, asked } = chain(112);
    const r = new ManagedRange<any>(query, true);
    await r.getPage({ current: 1, pageSize: 25 });
    await r.getPage({ current: 2, pageSize: 25 });
    await r.getPage({ current: 3, pageSize: 25 });
    // One probe, then one request per page.
    expect(asked.filter((a) => a.fromEnd)).toHaveLength(1);
    expect(asked).toHaveLength(4);
  });

  it('handles a chain shorter than one page', async () => {
    const { query } = chain(7);
    const r = new ManagedRange<any>(query, true);
    const page = await r.getPage({ current: 1, pageSize: 25 });
    expect(page.records.map((x: any) => x.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it('reports nothing for an empty chain', async () => {
    const { query } = chain(0);
    const r = new ManagedRange<any>(query, true);
    const page = await r.getPage({ current: 1, pageSize: 25 });
    expect(page.records).toEqual([]);
  });
});
