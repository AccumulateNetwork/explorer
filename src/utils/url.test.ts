import { describe, expect, it } from 'vitest';

import {
  encodeURLSpaces,
  retryWithoutTrailingSpaces,
  stripAccScheme,
} from './url';

// Account names may contain spaces, so search input cannot simply be trimmed
// (#32). The rule is: try the reference as typed, fall back to trimming
// trailing spaces only after that 404s, and always drop whitespace around an
// explicit `acc://` scheme.

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

  it('leaves input without a scheme untouched, including leading spaces', () => {
    expect(stripAccScheme('foo.acme/tokens')).toBe('foo.acme/tokens');
    expect(stripAccScheme(' foo.acme')).toBe(' foo.acme');
  });

  it('does not strip a scheme that appears mid-string', () => {
    expect(stripAccScheme('foo.acme/acc://bar')).toBe('foo.acme/acc://bar');
  });
});

describe('retryWithoutTrailingSpaces', () => {
  it('offers the trimmed reference when one or more spaces trail', () => {
    expect(retryWithoutTrailingSpaces('foo.acme/tokens ')).toBe(
      'foo.acme/tokens',
    );
    expect(retryWithoutTrailingSpaces('foo.acme/My Account   ')).toBe(
      'foo.acme/My Account',
    );
  });

  it('preserves interior spaces', () => {
    expect(retryWithoutTrailingSpaces('foo.acme/My Account ')).toBe(
      'foo.acme/My Account',
    );
  });

  it('offers nothing when there is no trailing space', () => {
    expect(retryWithoutTrailingSpaces('foo.acme/tokens')).toBeNull();
    expect(retryWithoutTrailingSpaces(' foo.acme')).toBeNull();
  });

  it('offers nothing when trimming would empty the reference', () => {
    expect(retryWithoutTrailingSpaces('   ')).toBeNull();
    expect(retryWithoutTrailingSpaces('')).toBeNull();
  });

  it('produces a reference that survives re-encoding', () => {
    const retry = retryWithoutTrailingSpaces('foo.acme/My Account ');
    expect(encodeURLSpaces(retry)).toBe('foo.acme/My%20Account');
  });
});
