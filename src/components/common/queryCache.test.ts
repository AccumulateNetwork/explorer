import { describe, expect, it } from 'vitest';

import { QueryCache, queryKey } from './queryCache';

// The rules this cache sits on decide whether the user sees fresh data. Every
// assertion here is about something that would be a user-visible bug: a stale
// record after switching networks, a transient failure replayed to everyone,
// or a burst of identical requests from one render pass.

/** A controllable clock, so the TTL is tested rather than waited out. */
function clock(start = 1_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

/** A loader that records its calls and resolves when told. */
function loader<T>(value: T) {
  let calls = 0;
  const resolvers: Array<(v: T) => void> = [];
  return {
    get calls() {
      return calls;
    },
    run: () => {
      calls++;
      return new Promise<T>((r) => resolvers.push(r));
    },
    settleAll: () => resolvers.splice(0).forEach((r) => r(value)),
  };
}

describe('queryKey', () => {
  it('separates the same scope on different networks', () => {
    // Switching networks must not show the previous network's record.
    expect(queryKey('mainnet', 'acc://alice.acme')).not.toBe(
      queryKey('kermit', 'acc://alice.acme'),
    );
  });

  it('separates different queries against one scope', () => {
    const scope = 'acc://alice.acme';
    expect(queryKey('mainnet', scope, { queryType: 'default' })).not.toBe(
      queryKey('mainnet', scope, { queryType: 'chain' }),
    );
  });

  it('treats an absent query as its own thing, not as undefined text', () => {
    expect(queryKey('mainnet', 'acc://a.acme')).not.toContain('undefined');
  });

  it('is stable for equal queries', () => {
    expect(queryKey('mainnet', 'acc://a.acme', { queryType: 'chain' })).toBe(
      queryKey('mainnet', 'acc://a.acme', { queryType: 'chain' }),
    );
  });
});

describe('in-flight de-duplication', () => {
  it('collapses concurrent callers onto one request', async () => {
    // The N+1 case: twenty rows asking about the same token account in one
    // render pass should produce one request, not twenty.
    const c = new QueryCache();
    const l = loader('record');
    const all = Promise.all(
      Array.from({ length: 20 }, () => c.fetch('k', l.run)),
    );
    expect(l.calls).toBe(1);
    expect(c.pending).toBe(1);
    l.settleAll();
    expect(await all).toEqual(Array(20).fill('record'));
  });

  it('gives every joined caller the same value', async () => {
    const c = new QueryCache();
    const l = loader({ id: 1 });
    const a = c.fetch('k', l.run);
    const b = c.fetch('k', l.run);
    l.settleAll();
    expect(await a).toBe(await b);
  });

  it('does not collapse different keys', async () => {
    const c = new QueryCache();
    const l = loader('x');
    c.fetch('a', l.run);
    c.fetch('b', l.run);
    expect(l.calls).toBe(2);
  });

  it('stops tracking a call once it settles', async () => {
    const c = new QueryCache();
    const l = loader('x');
    const p = c.fetch('k', l.run);
    l.settleAll();
    await p;
    expect(c.pending).toBe(0);
  });
});

describe('the freshness window', () => {
  it('serves a repeat within the window without asking again', async () => {
    const t = clock();
    const c = new QueryCache(2000, t.now);
    const l = loader('v1');
    const p = c.fetch('k', l.run);
    l.settleAll();
    await p;

    t.advance(500);
    expect(await c.fetch('k', l.run)).toBe('v1');
    expect(l.calls).toBe(1);
  });

  it('asks again once the window has passed', async () => {
    const t = clock();
    const c = new QueryCache(2000, t.now);
    const l = loader('v1');
    const p = c.fetch('k', l.run);
    l.settleAll();
    await p;

    t.advance(2001);
    c.fetch('k', l.run);
    expect(l.calls).toBe(2);
  });

  it('treats the boundary as expired', async () => {
    // A window that is open at exactly ttl would make the bound ambiguous.
    const t = clock();
    const c = new QueryCache(1000, t.now);
    const l = loader('v');
    const p = c.fetch('k', l.run);
    l.settleAll();
    await p;

    t.advance(1000);
    c.fetch('k', l.run);
    expect(l.calls).toBe(2);
  });

  it('drops the expired entry rather than accumulating it', async () => {
    const t = clock();
    const c = new QueryCache(1000, t.now);
    const l = loader('v');
    const p = c.fetch('k', l.run);
    l.settleAll();
    await p;
    expect(c.size).toBe(1);

    t.advance(5000);
    c.fetch('k', l.run);
    expect(c.size).toBe(0);
  });
});

describe('failures', () => {
  it('never caches a failure', async () => {
    // A transient network error replayed for the rest of the window would
    // show every later caller an error that is no longer true.
    const c = new QueryCache();
    let calls = 0;
    const failing = () => {
      calls++;
      return Promise.reject(new Error('offline'));
    };
    await expect(c.fetch('k', failing)).rejects.toThrow('offline');
    expect(c.size).toBe(0);
    expect(c.pending).toBe(0);

    await expect(c.fetch('k', failing)).rejects.toThrow('offline');
    expect(calls).toBe(2);
  });

  it('rejects every joined caller', async () => {
    const c = new QueryCache();
    const failing = () => Promise.reject(new Error('boom'));
    const a = c.fetch('k', failing);
    const b = c.fetch('k', failing);
    await expect(a).rejects.toThrow('boom');
    await expect(b).rejects.toThrow('boom');
  });

  it('allows a retry immediately after a failure', async () => {
    const c = new QueryCache();
    await expect(
      c.fetch('k', () => Promise.reject(new Error('once'))),
    ).rejects.toThrow();
    expect(await c.fetch('k', () => Promise.resolve('ok'))).toBe('ok');
  });
});

describe('invalidate', () => {
  it('forces the next call to ask again', async () => {
    const t = clock();
    const c = new QueryCache(10_000, t.now);
    const l = loader('v');
    const p = c.fetch('k', l.run);
    l.settleAll();
    await p;

    c.invalidate('k');
    c.fetch('k', l.run);
    expect(l.calls).toBe(2);
  });

  it('clears everything when given no key', async () => {
    const t = clock();
    const c = new QueryCache(10_000, t.now);
    const l = loader('v');
    const a = c.fetch('a', l.run);
    const b = c.fetch('b', l.run);
    l.settleAll();
    await Promise.all([a, b]);
    expect(c.size).toBe(2);

    c.invalidate();
    expect(c.size).toBe(0);
  });

  it('leaves an in-flight call running for whoever awaits it', async () => {
    const c = new QueryCache();
    const l = loader('v');
    const p = c.fetch('k', l.run);
    c.invalidate('k');
    l.settleAll();
    expect(await p).toBe('v');
  });
});
