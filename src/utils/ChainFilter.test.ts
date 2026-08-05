import { describe, expect, it } from 'vitest';

import { ChainEntryRecord } from 'accumulate.js/lib/api_v3';

import { ChainFilter } from './ChainFilter';

// ChainFilter scans a chain newest-first in 50-entry pages, keeping entries
// that pass the filter. The API answers a fromEnd range with
// start = total - count (confirmed on mainnet: acc://ACME main chain →
// start: 109, total: 112, count: 3), which the old first-page termination
// test misread as "scanned everything", truncating filtered chains to
// whatever matched within the newest 50 entries (#41).

/** A fake chain of `total` entries whose index is their position. */
function fakeApi(total: number, log?: Array<{ start: number; count: number }>) {
  return {
    async query(_scope: unknown, q: { range?: unknown }) {
      const range = (
        q as { range: { start: number; count: number; fromEnd?: boolean } }
      ).range;
      let { start, count } = range;
      if (range.fromEnd) {
        start = Math.max(0, total - count);
      }
      count = Math.min(count, total - start);
      log?.push({ start, count });
      return {
        start,
        total,
        records: Array.from(
          { length: count },
          (_, i) => new ChainEntryRecord({ index: start + i }),
        ),
      };
    },
  };
}

const chainQuery = { queryType: 'chain', name: 'main' } as const;

function filtered(total: number, keep: (i: number) => boolean) {
  return new ChainFilter<ChainEntryRecord>(
    fakeApi(total) as never,
    'acc://alice.acme/data',
    chainQuery as never,
    (r) => keep(r.index),
  );
}

describe('ChainFilter', () => {
  it('passes the total through unfiltered', async () => {
    const f = new ChainFilter<ChainEntryRecord>(
      fakeApi(112) as never,
      'acc://alice.acme/data',
      chainQuery as never,
    );
    const r = await f.getRange({ start: 0, count: 10 });
    expect(r.records).toHaveLength(10);
    // Newest first
    expect(r.records[0].index).toBe(111);
    expect(r.records[9].index).toBe(102);
    expect(f.total).toBe(112);
  });

  it('counts matches beyond the newest 50 entries (#41)', async () => {
    // Multiples of 10 in 0..111: twelve matches, but only five (70..110) sit
    // within the newest 50 (62..111). The old code reported total = 5 and made
    // the other seven unreachable.
    const f = filtered(112, (i) => i % 10 == 0);
    const r = await f.getRange({ start: 0, count: 50 });
    expect(f.total).toBe(12);
    expect(r.records.map((x) => x.index)).toEqual([
      110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0,
    ]);
  });

  it('reaches matches when the newest 50 entries have none', async () => {
    // All matches are older than the first page. The old code either reported
    // zero or, with the naive start==0 fix alone, refetched the newest page
    // forever because no kept entry recorded the scan progress.
    const f = filtered(112, (i) => i < 20);
    const r = await f.getRange({ start: 0, count: 50 });
    expect(f.total).toBe(20);
    expect(r.records[0].index).toBe(19);
    expect(r.records[19].index).toBe(0);
  });

  it('reports zero when nothing matches', async () => {
    const f = filtered(112, () => false);
    const r = await f.getRange({ start: 0, count: 10 });
    expect(f.total).toBe(0);
    expect(r.records).toHaveLength(0);
  });

  it('handles a chain shorter than one page', async () => {
    const f = filtered(7, (i) => i % 2 == 0);
    const r = await f.getRange({ start: 0, count: 10 });
    expect(f.total).toBe(4);
    expect(r.records.map((x) => x.index)).toEqual([6, 4, 2, 0]);
  });

  it('handles an empty chain', async () => {
    const f = filtered(0, () => true);
    const r = await f.getRange({ start: 0, count: 10 });
    expect(f.total).toBe(0);
    expect(r.records).toHaveLength(0);
  });

  it('returns null past the end of the matches', async () => {
    const f = filtered(112, (i) => i % 10 == 0);
    expect((await f.getIndex(11)).index).toBe(0);
    expect(await f.getIndex(12)).toBeNull();
  });

  it('scans each page exactly once', async () => {
    const log: Array<{ start: number; count: number }> = [];
    const f = new ChainFilter<ChainEntryRecord>(
      fakeApi(112, log) as never,
      'acc://alice.acme/data',
      chainQuery as never,
      () => false,
    );
    await f.getRange({ start: 0, count: 10 });
    // 112 entries in pages of 50: [62,112) fromEnd, [12,62), [0,12)
    expect(log).toEqual([
      { start: 62, count: 50 },
      { start: 12, count: 50 },
      { start: 0, count: 12 },
    ]);
  });
});
