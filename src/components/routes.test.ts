import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

// Guards the react-router v6 route table in Explorer.tsx — especially the
// splat routes, whose behavior changed from v5's ":url+" to v6's "/*" and
// which carry slash-containing account/transaction references. These are the
// routes that can't be verified by a type check.

describe('route matching (v6)', () => {
  it('matches an account URL with slashes via the /acc/* splat', () => {
    const m = matchPath('/acc/*', '/acc/acc://alice.acme/tokens');
    expect(m).not.toBeNull();
    expect(m?.params['*']).toBe('acc://alice.acme/tokens');
  });

  it('matches a bare transaction hash via the /tx/* splat', () => {
    const hash = 'a'.repeat(64);
    const m = matchPath('/tx/*', `/tx/${hash}`);
    expect(m?.params['*']).toBe(hash);
  });

  it('matches a data URL via the /data/* splat', () => {
    const m = matchPath('/data/*', '/data/acc://alice.acme/data');
    expect(m?.params['*']).toBe('acc://alice.acme/data');
  });

  it('matches /block/:index and extracts the index', () => {
    const m = matchPath('/block/:index', '/block/12345');
    expect(m?.params.index).toBe('12345');
  });

  it('root is exact and does not swallow other paths', () => {
    expect(matchPath('/', '/')).not.toBeNull();
    expect(matchPath('/', '/tokens')).toBeNull();
  });

  it('static routes match exactly', () => {
    expect(matchPath('/validators', '/validators')).not.toBeNull();
    expect(matchPath('/staking', '/staking')).not.toBeNull();
    // A static route must not greedily match a sub-path.
    expect(matchPath('/tokens', '/tokens/extra')).toBeNull();
  });

  it('the catch-all matches anything', () => {
    expect(matchPath('*', '/nonexistent/path')?.params['*']).toBe(
      'nonexistent/path',
    );
  });
});
