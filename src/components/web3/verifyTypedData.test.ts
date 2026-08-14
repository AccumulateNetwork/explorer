import { describe, expect, it } from 'vitest';

import fixture from './__fixtures__/acc-typed-data.json';
import { verifyTypedData } from './verifyTypedData';

// A real acc_typedData exchange with the Kermit endpoint: a SendTokens
// transaction and the EIP-712 typed data returned for it. The app used to pass
// that response straight to the wallet with a "verify the result matches the
// request?" TODO, so an endpoint that returned typed data for a different
// transaction would have been signed (#60).

const { transaction, signature } = fixture.request;
const message = fixture.response.message as Record<string, any>;

/** The response with one value changed, as a hostile endpoint would return. */
const tampered = (mutate: (m: any) => void) => {
  const copy = JSON.parse(JSON.stringify(message));
  mutate(copy);
  return copy;
};

const check = (m: Record<string, any>) =>
  verifyTypedData(m, transaction, signature);

describe('verifyTypedData', () => {
  it('accepts the endpoint’s own answer', () => {
    expect(() => check(message)).not.toThrow();
  });

  it('rejects a redirected payment', () => {
    expect(() =>
      check(
        tampered((m) => (m.sendTokens.to[0].url = 'acc://mallory.acme/tokens')),
      ),
    ).toThrow(/does not match/);
  });

  it('rejects an altered amount', () => {
    expect(() =>
      check(tampered((m) => (m.sendTokens.to[0].amount = '100000'))),
    ).toThrow(/does not match/);
  });

  it('rejects an added recipient', () => {
    // The case a one-way "everything I sent is present" check would sign:
    // our recipient is intact, and a second one has been appended.
    expect(() =>
      check(
        tampered((m) =>
          m.sendTokens.to.push({
            url: 'acc://mallory.acme/tokens',
            amount: '999999',
          }),
        ),
      ),
    ).toThrow(/expected 1 entries, got 2/);
  });

  it('rejects a substituted principal', () => {
    expect(() =>
      check(tampered((m) => (m.header.principal = 'acc://victim.acme/tokens'))),
    ).toThrow(/header\.principal/);
  });

  it('rejects tampered signature metadata', () => {
    expect(() =>
      check(
        tampered((m) => (m.signature.signer = 'acc://mallory.acme/book/1')),
      ),
    ).toThrow(/signature\.signer/);
    expect(() => check(tampered((m) => (m.signature.timestamp = 1)))).toThrow(
      /signature\.timestamp/,
    );
    expect(() =>
      check(tampered((m) => (m.signature.publicKey = '0x' + '11'.repeat(33)))),
    ).toThrow(/signature\.publicKey/);
  });

  it('rejects typed data describing a different transaction type', () => {
    expect(() =>
      check(
        tampered((m) => {
          m.burnTokens = m.sendTokens;
          delete m.sendTokens;
        }),
      ),
    ).toThrow(/does not describe a sendTokens/);
  });

  it('rejects a smuggled field the request did not contain', () => {
    expect(() =>
      check(tampered((m) => (m.header.memo = 'authorize everything'))),
    ).toThrow(/header\.memo: added/);
  });

  it('tolerates the placeholders the endpoint fills in', () => {
    // The real response already carries empty strings and arrays we never
    // sent (initiator, memo, metadata, authorities, delegators). If those
    // were treated as tampering, nothing would ever sign.
    expect(message.header.initiator).toBe('');
    expect(message.header.authorities).toEqual([]);
    expect(() => check(message)).not.toThrow();
  });

  it('rejects a response with no message at all', () => {
    expect(() => verifyTypedData(undefined, transaction, signature)).toThrow(
      /no message/,
    );
  });
});
