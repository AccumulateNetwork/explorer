import { describe, expect, it } from 'vitest';

import {
  encodeURLSpaces,
  parseRouteRef,
  retryWithoutOuterSpaces,
  stripAccScheme,
  txIdFromRef,
} from './url';

// Account names may contain spaces, so search input cannot simply be trimmed
// up front (#32). The rule is: try the reference as typed, fall back to
// trimming both ends only after that 404s, and always drop whitespace around
// an explicit `acc://` scheme.

describe('stripAccScheme', () => {
  it('drops the scheme and the whitespace around it', () => {
    expect(stripAccScheme('  acc://foo.acme/tokens')).toBe('foo.acme/tokens');
    expect(stripAccScheme('acc://  foo.acme/tokens')).toBe('foo.acme/tokens');
    expect(stripAccScheme(' acc:// foo.acme')).toBe('foo.acme');
  });

  it('matches the scheme case-insensitively', () => {
    expect(stripAccScheme('ACC://foo.acme')).toBe('foo.acme');
  });

  it('keeps a trailing space, which may be part of the name', () => {
    expect(stripAccScheme('acc://foo.acme/My Account ')).toBe(
      'foo.acme/My Account ',
    );
  });

  it('leaves input without a scheme untouched', () => {
    // Without the scheme a leading space could still be part of the name, so
    // it survives the first attempt and is only dropped by the 404 fallback.
    expect(stripAccScheme('foo.acme/tokens')).toBe('foo.acme/tokens');
    expect(stripAccScheme(' foo.acme')).toBe(' foo.acme');
  });

  it('does not strip a scheme that appears mid-string', () => {
    expect(stripAccScheme('foo.acme/acc://bar')).toBe('foo.acme/acc://bar');
  });
});

describe('txIdFromRef', () => {
  const hash =
    'accc878f25c1051b5e78823d20c7466f474fe67dbd3df49ffdf3e948c1621212';

  it('appends @unknown to a bare hash', () => {
    expect(txIdFromRef(hash)).toBe(`${hash}@unknown`);
  });

  it('leaves a canonical <hash>@authority TxID alone (#69)', () => {
    // Appending a second @ would make the WHATWG parser fold `@acme` into
    // the hash as `%40acme`, producing an unqueryable TxID.
    expect(txIdFromRef(`${hash}@acme`)).toBe(`${hash}@acme`);
    expect(txIdFromRef(`${hash}@unknown`)).toBe(`${hash}@unknown`);
  });
});

describe('parseRouteRef', () => {
  it('parses a normal account reference', () => {
    const url = parseRouteRef('alice.acme/tokens');
    expect(url.authority).toBe('alice.acme');
    expect(url.path).toBe('/tokens');
  });

  it('keeps the username of a TxID reference', () => {
    const hash = 'a'.repeat(64);
    expect(parseRouteRef(`${hash}@unknown`).username).toBe(hash);
  });

  it('falls back cleanly for a name the WHATWG parser rejects (#45)', () => {
    // URL.parse('ACME%20') throws, so this exercises the fallback. It used
    // to render 'acc://ACME undefined' from the unset pathname.
    const url = parseRouteRef('ACME ');
    expect(url.toString()).toBe('acc://ACME ');
    expect(url.username).toBe('');
    expect(`${url.username || url.toString().replace(/^acc:\/\//, '')}`).toBe(
      'ACME ',
    );
  });

  it('returns null for an empty reference instead of throwing (#45)', () => {
    expect(parseRouteRef('')).toBeNull();
  });
});

describe('retryWithoutOuterSpaces', () => {
  it('offers the trimmed reference when spaces trail', () => {
    expect(retryWithoutOuterSpaces('foo.acme/tokens ')).toBe('foo.acme/tokens');
    expect(retryWithoutOuterSpaces('foo.acme/My Account   ')).toBe(
      'foo.acme/My Account',
    );
  });

  it('offers the trimmed reference when spaces lead', () => {
    expect(retryWithoutOuterSpaces(' foo.acme/tokens')).toBe('foo.acme/tokens');
    expect(retryWithoutOuterSpaces('   foo.acme')).toBeTruthy();
  });

  it('trims both ends at once', () => {
    expect(retryWithoutOuterSpaces('  foo.acme/My Account  ')).toBe(
      'foo.acme/My Account',
    );
  });

  it('preserves interior spaces', () => {
    expect(retryWithoutOuterSpaces(' foo.acme/My Account ')).toBe(
      'foo.acme/My Account',
    );
  });

  it('offers nothing when neither end has whitespace', () => {
    expect(retryWithoutOuterSpaces('foo.acme/tokens')).toBeNull();
    expect(retryWithoutOuterSpaces('foo.acme/My Account')).toBeNull();
  });

  it('offers nothing when trimming would empty the reference', () => {
    expect(retryWithoutOuterSpaces('   ')).toBeNull();
    expect(retryWithoutOuterSpaces('')).toBeNull();
  });

  it('produces a reference that survives re-encoding', () => {
    const retry = retryWithoutOuterSpaces(' foo.acme/My Account ');
    expect(encodeURLSpaces(retry)).toBe('foo.acme/My%20Account');
  });
});
