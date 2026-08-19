import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from './Explorer';

// Driven off the route table Explorer actually renders. The previous version
// hardcoded the same pattern strings, so it verified react-router's matchPath
// rather than this application — changing a path in Explorer left it passing —
// and it omitted five live routes (#67).
//
// Routing is what turns a URL into a page, and the splat routes carry
// slash-containing account and transaction references, so they cannot be
// checked by the type checker.

/** The first route whose pattern matches, as the router would resolve it. */
function resolve(url: string): string | undefined {
  return ROUTE_PATHS.find((p) => p !== '*' && matchPath(p, url)) ?? '*';
}

describe('the route table', () => {
  it('serves every page the app links to', () => {
    for (const path of [
      '/',
      '/validators',
      '/tokens',
      '/staking',
      '/favourites',
      '/blocks',
      '/network',
      '/settings',
      '/faucet',
    ]) {
      expect(ROUTE_PATHS).toContain(path);
      expect(resolve(path)).toBe(path);
    }
  });

  it('routes account URLs, including slashes, to /acc/*', () => {
    const m = matchPath('/acc/*', '/acc/acc://alice.acme/tokens');
    expect(m?.params['*']).toBe('acc://alice.acme/tokens');
    expect(resolve('/acc/acc://alice.acme/tokens')).toBe('/acc/*');
  });

  it('routes both transaction reference forms to /tx/*', () => {
    const hash = 'a'.repeat(64);
    expect(resolve(`/tx/${hash}`)).toBe('/tx/*');
    // The canonical TxID form, which used to break the lookup (#69).
    expect(matchPath('/tx/*', `/tx/${hash}@acme`)?.params['*']).toBe(
      `${hash}@acme`,
    );
  });

  it('routes data entries and blocks', () => {
    expect(resolve('/data/acc://alice.acme/data')).toBe('/data/*');
    expect(matchPath('/block/:index', '/block/12345')?.params.index).toBe(
      '12345',
    );
  });

  it('sends anything unrecognized to the catch-all', () => {
    expect(resolve('/nonexistent/path')).toBe('*');
    expect(matchPath('*', '/nonexistent/path')?.params['*']).toBe(
      'nonexistent/path',
    );
  });

  it('does not let a static route swallow a sub-path', () => {
    expect(matchPath('/tokens', '/tokens/extra')).toBeNull();
    expect(resolve('/tokens/extra')).toBe('*');
  });

  it('keeps the catch-all last, so it cannot shadow a real route', () => {
    expect(ROUTE_PATHS[ROUTE_PATHS.length - 1]).toBe('*');
    expect(ROUTE_PATHS.filter((p) => p === '*')).toHaveLength(1);
  });

  it('has no duplicate patterns', () => {
    expect(new Set(ROUTE_PATHS).size).toBe(ROUTE_PATHS.length);
  });
});
