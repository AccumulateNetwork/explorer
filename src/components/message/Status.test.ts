import { describe, expect, it } from 'vitest';

import { errors } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';

import { getProducedStatus } from './Status';

// A transaction is only really delivered once everything it produced is
// delivered. The recursive branch used to be left un-awaited, so `results`
// held Promises, `Promise >= 400` was false, and any transaction with produced
// messages reported Delivered — a failed synthetic deposit rendered as SUCCESS
// (#35).

const { Delivered, Pending, NotFound } = errors.Status;

/** Minimal stand-in for a MessageRecord, keyed by id for the fake API. */
function msg(id: string, status: number, produced: string[] = []): any {
  return {
    recordType: RecordType.Message,
    id,
    status,
    produced: produced.length
      ? { records: produced.map((p) => ({ value: p })) }
      : undefined,
  };
}

function errorRecord(code: number): any {
  return { recordType: RecordType.Error, value: { code } };
}

/** Fake JsonRpcClient: resolves an id to whatever the test registered. */
function fakeApi(graph: Record<string, any>) {
  return {
    query: async (id: any) => {
      const r = graph[`${id}`];
      if (!r) throw new Error(`test graph has no record for ${id}`);
      return r;
    },
  } as any;
}

describe('getProducedStatus', () => {
  it('reports a failed produced message instead of Delivered', async () => {
    const root = msg('root', Delivered, ['child']);
    const api = fakeApi({ child: msg('child', 500) });
    // Before the fix this returned Delivered — a green SUCCESS tag on a
    // transaction whose synthetic message failed.
    expect(await getProducedStatus(api, root)).toBe(500);
  });

  it('reports a pending produced message instead of Delivered', async () => {
    const root = msg('root', Delivered, ['child']);
    const api = fakeApi({ child: msg('child', Pending) });
    expect(await getProducedStatus(api, root)).toBe(Pending);
  });

  it('finds a failure nested two levels down', async () => {
    const root = msg('root', Delivered, ['a']);
    const api = fakeApi({
      a: msg('a', Delivered, ['b']),
      b: msg('b', 500),
    });
    expect(await getProducedStatus(api, root)).toBe(500);
  });

  it('prefers a failure over a pending sibling', async () => {
    const root = msg('root', Delivered, ['ok', 'pending', 'failed']);
    const api = fakeApi({
      ok: msg('ok', Delivered),
      pending: msg('pending', Pending),
      failed: msg('failed', 500),
    });
    expect(await getProducedStatus(api, root)).toBe(500);
  });

  it('treats a missing produced message as pending', async () => {
    const root = msg('root', Delivered, ['gone']);
    const api = fakeApi({ gone: errorRecord(NotFound) });
    expect(await getProducedStatus(api, root)).toBe(Pending);
  });

  it('ignores unexpected error codes rather than reporting them', async () => {
    const root = msg('root', Delivered, ['odd']);
    const api = fakeApi({ odd: errorRecord(Delivered) });
    expect(await getProducedStatus(api, root)).toBe(Delivered);
  });

  it('reports Delivered when every produced message is delivered', async () => {
    const root = msg('root', Delivered, ['a', 'b']);
    const api = fakeApi({
      a: msg('a', Delivered),
      b: msg('b', Delivered),
    });
    expect(await getProducedStatus(api, root)).toBe(Delivered);
  });

  it('short-circuits when the transaction produced nothing', async () => {
    const api = fakeApi({});
    expect(await getProducedStatus(api, msg('root', Delivered))).toBe(
      Delivered,
    );
  });

  it('returns the transaction status when it is not itself delivered', async () => {
    const root = msg('root', Pending, ['child']);
    const api = fakeApi({ child: msg('child', 500) });
    expect(await getProducedStatus(api, root)).toBe(Pending);
  });
});
