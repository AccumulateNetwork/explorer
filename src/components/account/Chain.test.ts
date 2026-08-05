import { describe, expect, it } from 'vitest';

import { URL } from 'accumulate.js';

import { makeChainRange } from './Chain';

// The range behind a chain table is bound to one account at construction.
// Chain must construct a new one whenever its url/type changes — useState
// captured the first render's url, so navigating token account A -> B kept
// querying A under B's heading (#39). These tests pin the factory's binding;
// the component memoizes it on [url, type, api].

function fakeApi(total: number) {
  const calls: Array<{ scope: string; query: Record<string, unknown> }> = [];
  const api = {
    async query(scope: unknown, query: Record<string, unknown>) {
      calls.push({ scope: `${scope}`, query });
      return {
        start: 0,
        total,
        records: [{ index: total - 1 }],
      };
    },
  };
  return { api, calls };
}

const alice = URL.parse('acc://alice.acme/tokens');

describe('makeChainRange', () => {
  it('queries the account and chain it was created for', async () => {
    const { api, calls } = fakeApi(30);
    const range = makeChainRange(api as never, alice, 'main');
    await range.getPage({ current: 1, pageSize: 10 });

    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.scope).toBe('acc://alice.acme/tokens');
      expect(c.query.queryType).toBe('chain');
      expect(c.query.name).toBe('main');
    }
  });

  it('issues pending queries for the pending chain', async () => {
    const { api, calls } = fakeApi(3);
    const range = makeChainRange(api as never, alice, 'pending');
    await range.getPage({ current: 1, pageSize: 10 });

    expect(calls).toHaveLength(1);
    expect(calls[0].scope).toBe('acc://alice.acme/tokens');
    expect(calls[0].query.queryType).toBe('pending');
  });

  it('binds each range to its own account', async () => {
    // Two ranges over different accounts must not share state — the bug was
    // one long-lived range serving every account the page navigated to.
    const a = fakeApi(5);
    const b = fakeApi(5);
    const rangeA = makeChainRange(a.api as never, alice, 'main');
    const rangeB = makeChainRange(
      b.api as never,
      URL.parse('acc://bob.acme/tokens'),
      'main',
    );
    await rangeA.getPage({ current: 1, pageSize: 5 });
    await rangeB.getPage({ current: 1, pageSize: 5 });

    expect(a.calls.every((c) => c.scope === 'acc://alice.acme/tokens')).toBe(
      true,
    );
    expect(b.calls.every((c) => c.scope === 'acc://bob.acme/tokens')).toBe(
      true,
    );
  });
});
