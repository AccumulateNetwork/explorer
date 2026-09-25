import { describe, expect, it } from 'vitest';

import {
  formatSupply,
  searchError,
  searchTokensUrl,
  topTokensUrl,
} from './tokenRegistry';

describe('formatSupply', () => {
  it('groups the whole part and keeps every fractional digit', () => {
    expect(formatSupply('341492185.56237373')).toBe('341,492,185.56237373');
    expect(formatSupply('1165041.11')).toBe('1,165,041.11');
    expect(formatSupply('999')).toBe('999');
    expect(formatSupply('0.00000005')).toBe('0.00000005');
  });

  it('does not round a supply beyond 2^53', () => {
    // As a Number this is 9007199254740992.
    expect(formatSupply('9007199254740993')).toBe('9,007,199,254,740,993');
  });

  it('leaves anything that is not a decimal alone', () => {
    expect(formatSupply('')).toBe('');
    expect(formatSupply('n/a')).toBe('n/a');
  });
});

describe('request URLs', () => {
  const m = 'https://metrics.accumulatenetwork.io/v1';

  it('asks for the top ten by default', () => {
    expect(topTokensUrl(m)).toBe(`${m}/tokens/top?count=10`);
  });

  it('encodes a regular expression intact', () => {
    const url = new URL(searchTokensUrl(m, '^pegnet\\.acme/(usd|eur)$', 20));
    expect(url.pathname).toBe('/v1/tokens');
    expect(url.searchParams.get('search')).toBe('^pegnet\\.acme/(usd|eur)$');
    expect(url.searchParams.get('start')).toBe('20');
    expect(url.searchParams.get('count')).toBe('20');
  });
});

describe('searchError', () => {
  it("shows the server's reason for a bad pattern", () => {
    const err = {
      response: {
        status: 400,
        data: 'invalid regular expression: missing closing ): `(x`\n',
      },
    };
    expect(searchError(err)).toBe(
      'invalid regular expression: missing closing ): `(x`',
    );
  });

  it('falls back for anything else', () => {
    expect(searchError(new Error('Network Error'))).toBe('Search failed');
    expect(searchError({ response: { status: 503, data: 'x' } })).toBe(
      'Search failed',
    );
  });
});
