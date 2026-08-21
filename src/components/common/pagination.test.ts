import { describe, expect, it } from 'vitest';

import {
  Source,
  footerState,
  hasMore,
  initialState,
  isWindowed,
  reduce,
  sameContent,
  visibleCount,
} from './pagination';

// The rules every infinite list in the app pages by. These lived twice, once
// in each component, and drifted (#62) — exhaustion detection existed in only
// one of the copies, so a server list whose `total` ran high re-requested
// forever. Testing them here is the reason the components can now share one
// implementation.

const rows = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: from + i }));

const server = (total: number): Source => ({
  server: true,
  windowed: isWindowed(total),
  total,
});
const array = (total: number): Source => ({
  server: false,
  windowed: isWindowed(total),
  total,
});

describe('the page reducer', () => {
  it('appends or replaces, as asked', () => {
    let s = initialState(rows(3), false);
    s = reduce(s, {
      type: 'page',
      page: rows(2, 3),
      append: true,
      short: false,
    });
    expect(s.items.map((r) => r.id)).toEqual([0, 1, 2, 3, 4]);

    s = reduce(s, {
      type: 'page',
      page: rows(1, 9),
      append: false,
      short: false,
    });
    expect(s.items.map((r) => r.id)).toEqual([9]);
  });

  it('latches exhaustion rather than assigning it', () => {
    // A source that reported its end must stay ended. Assigning here would
    // let a later full page re-open a list that has nothing left.
    let s = initialState(rows(0), false);
    s = reduce(s, { type: 'page', page: rows(3), append: true, short: true });
    expect(s.exhausted).toBe(true);

    s = reduce(s, { type: 'page', page: rows(25), append: true, short: false });
    expect(s.exhausted).toBe(true);
  });

  it('clears the error when a new load starts', () => {
    // Otherwise Retry leaves its own failure message sitting beside the
    // spinner it just started.
    let s = reduce(initialState(rows(0), false), {
      type: 'failed',
      error: new Error('boom'),
    });
    expect(s.error).toBeTruthy();
    s = reduce(s, { type: 'loading' });
    expect(s.error).toBeNull();
    expect(s.loading).toBe(true);
  });

  it('keeps the rows it had when a load fails', () => {
    // A failed "load more" must not blank the page the user is reading.
    let s = initialState(rows(25), false);
    s = reduce(s, { type: 'loading' });
    s = reduce(s, { type: 'failed', error: new Error('nope') });
    s = reduce(s, { type: 'settled' });
    expect(s.items).toHaveLength(25);
    expect(s.loading).toBe(false);
    expect(s.error).toBeTruthy();
  });

  it('drops enrichment and exhaustion on reset', () => {
    // A new data source knows nothing about the old one's end or its labels.
    let s = initialState(rows(5), false);
    s = reduce(s, { type: 'page', page: rows(1), append: true, short: true });
    s = reduce(s, { type: 'enriched', entries: new Map([['a', 1]]) });
    expect(s.exhausted).toBe(true);
    expect(s.enrichment?.size).toBe(1);

    s = reduce(s, { type: 'reset', items: rows(2) });
    expect(s.exhausted).toBe(false);
    expect(s.enrichment).toBeNull();
    expect(s.error).toBeNull();
    expect(s.items).toHaveLength(2);
  });

  it('merges enrichment across pages instead of replacing it', () => {
    // Page two's labels must not erase page one's; both are on screen.
    let s = initialState(rows(0), false);
    s = reduce(s, { type: 'enriched', entries: new Map([['a', 1]]) });
    s = reduce(s, { type: 'enriched', entries: new Map([['b', 2]]) });
    expect([...s.enrichment!.entries()]).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('later enrichment wins for the same key', () => {
    let s = initialState(rows(0), false);
    s = reduce(s, { type: 'enriched', entries: new Map([['a', 1]]) });
    s = reduce(s, { type: 'enriched', entries: new Map([['a', 2]]) });
    expect(s.enrichment!.get('a')).toBe(2);
  });

  it('ignores an empty enrichment result', () => {
    // Identity must not change, or every empty batch re-renders every row.
    const s = initialState(rows(0), false);
    expect(reduce(s, { type: 'enriched', entries: new Map() })).toBe(s);
  });

  it('does not mutate the state it was given', () => {
    const s = initialState(rows(2), false);
    const before = s.items;
    reduce(s, { type: 'page', page: rows(2, 2), append: true, short: false });
    expect(s.items).toBe(before);
    expect(s.items).toHaveLength(2);
  });
});

describe('hasMore', () => {
  it('pages a server list until it reaches the total', () => {
    const s = initialState(rows(25), false);
    expect(hasMore(s, server(100))).toBe(true);
    expect(hasMore(initialState(rows(100), false), server(100))).toBe(false);
  });

  it('stops a server list at a short page even below the total', () => {
    // The case InfiniteList shipped without: `total` is a guess, so only the
    // short page knows the truth. Without this the list asks forever.
    let s = initialState(rows(0), false);
    s = reduce(s, { type: 'page', page: rows(12), append: true, short: true });
    expect(hasMore(s, server(1000))).toBe(false);
  });

  it('never pages a short array list', () => {
    // Below the windowing limit everything is already on screen.
    const s = initialState(rows(4), false);
    expect(hasMore(s, array(4))).toBe(false);
  });

  it('pages a windowed array list up to its length', () => {
    expect(hasMore(initialState(rows(25), false), array(80))).toBe(true);
    expect(hasMore(initialState(rows(80), false), array(80))).toBe(false);
  });

  it('does not page an empty source', () => {
    expect(hasMore(initialState([], false), server(0))).toBe(false);
    expect(hasMore(initialState([], false), array(0))).toBe(false);
  });
});

describe('isWindowed', () => {
  it('turns on past the short-list limit', () => {
    expect(isWindowed(10)).toBe(false);
    expect(isWindowed(11)).toBe(true);
  });
});

describe('visibleCount', () => {
  it('shows everything when the list is short', () => {
    expect(
      visibleCount({ windowed: false, total: 7, pageSize: 25, loaded: 0 }),
    ).toBe(7);
  });

  it('keeps the rows already scrolled past', () => {
    // The /network poll rebuilds its rows every 2s; without this the user is
    // thrown back to the first page each time.
    expect(
      visibleCount({ windowed: true, total: 500, pageSize: 25, loaded: 125 }),
    ).toBe(125);
  });

  it('shows at least one page', () => {
    expect(
      visibleCount({ windowed: true, total: 500, pageSize: 25, loaded: 0 }),
    ).toBe(25);
  });

  it('never claims more rows than the source has', () => {
    expect(
      visibleCount({ windowed: true, total: 12, pageSize: 25, loaded: 0 }),
    ).toBe(12);
  });
});

describe('footerState', () => {
  const long = server(500);

  it('shows the error and its retry above everything else', () => {
    let s = initialState(rows(25), true);
    s = reduce(s, { type: 'failed', error: new Error('x') });
    expect(footerState(s, long)).toBe('error');
  });

  it('shows loading only when there are already rows', () => {
    // With no rows the container renders its own spinner; two would show.
    expect(footerState(initialState(rows(25), true), long)).toBe('loading');
    expect(footerState(initialState([], true), long)).toBeNull();
  });

  it('shows the end marker once a windowed list is complete', () => {
    const s = initialState(rows(500), false);
    expect(footerState(s, long)).toBe('end');
  });

  it('shows no end marker on a short list', () => {
    // Nothing was paged, so "End" would be noise under a 4-row list.
    expect(footerState(initialState(rows(4), false), array(4))).toBeNull();
  });

  it('shows nothing while a complete list sits idle with no rows', () => {
    expect(footerState(initialState([], false), server(0))).toBeNull();
  });
});

describe('sameContent', () => {
  it('sees through a rebuilt array of equal length', () => {
    // The bug this exists for: same length, same values, new identities.
    const a = [{ id: 1 }, { id: 2 }];
    expect(sameContent(a, [...a])).toBe(true);
    expect(sameContent(a, [{ id: 1 }, { id: 2 }])).toBe(false);
  });

  it('notices a replaced element in place', () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [a[0], { id: 2 }];
    expect(sameContent(a, b)).toBe(false);
  });

  it('notices a length change', () => {
    const a = [{ id: 1 }];
    expect(sameContent(a, [a[0], { id: 2 }])).toBe(false);
  });

  it('treats the first render as a change', () => {
    expect(sameContent(null, [])).toBe(false);
  });

  it('matches two empty sources', () => {
    expect(sameContent([], [])).toBe(true);
  });
});
