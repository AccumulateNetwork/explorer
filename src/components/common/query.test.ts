import { describe, expect, it } from 'vitest';

import { RecordType, RpcError } from 'accumulate.js/lib/api_v3';
import { Status } from 'accumulate.js/lib/errors';

import { isClientError, isErrorRecord } from './query';

// These two decide what a failed query looks like to the user: a clean "not
// found" page, an error banner, or an unhandled rejection that blanks the
// screen. Both are used as `.catch(...)` handlers, so the important part of
// their contract is what they swallow and what they rethrow.

describe('isErrorRecord', () => {
  it('turns an API error into a record the page can render', () => {
    const r: any = isErrorRecord({ data: { code: 'notFound', message: 'no' } });
    expect(r.recordType).toBe(RecordType.Error);
    expect(r.value.code).toBe(Status.NotFound);
  });

  it('rethrows anything that is not an API error', () => {
    // A network failure or a programming mistake must not be dressed up as a
    // 404 — the page would claim the account does not exist.
    expect(() => isErrorRecord(new TypeError('boom'))).toThrow(TypeError);
    expect(() => isErrorRecord('nope')).toThrow();
    expect(() => isErrorRecord(undefined)).toThrow();
  });

  it('rethrows an object whose data is not an object', () => {
    expect(() => isErrorRecord({ data: 'not structured' })).toThrow();
  });
});

describe('isClientError', () => {
  const rpc = (code: number, data: unknown) =>
    new RpcError({ code, message: 'x', data } as never);

  it('returns a client error so the caller can show it', () => {
    const err = isClientError(
      rpc(-33404, { code: 'notFound', message: 'missing' }),
    );
    expect(err.code).toBe(Status.NotFound);
  });

  it('rethrows anything that is not an RPC error', () => {
    expect(() => isClientError(new Error('boom'))).toThrow(/boom/);
  });

  it('rethrows RPC errors outside the Accumulate range', () => {
    // -32602 is JSON-RPC's own invalid-params, not an application error.
    expect(() => isClientError(rpc(-32602, { code: 'notFound' }))).toThrow();
  });

  it('rethrows server errors rather than presenting them as client errors', () => {
    // A 500 is not something the user can act on by fixing their input.
    expect(() =>
      isClientError(rpc(-33500, { code: 'internalError', message: 'boom' })),
    ).toThrow();
  });

  it('rethrows when the payload cannot be parsed as an error', () => {
    expect(() => isClientError(rpc(-33404, undefined))).toThrow();
  });
});
