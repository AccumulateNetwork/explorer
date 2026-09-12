import { describe, expect, it } from 'vitest';

import {
  ambientNetworkName,
  defaultNetworkName,
  networkFromSearch,
  unknownNetworkParam,
  withNetworkParam,
} from './Network';

// What a link resolves to must depend on the link, never on the reader.
//
// It used to depend on both, and the reader won: a stored selection sat above
// the hostname, so anyone who had ever used the network selector overrode
// every network-specific deep link they were given — kermit.explorer/tx/… on
// Mainnet, the same symptom as #73 arriving by a different route. Storage is
// now absent from resolution entirely (#84).

const KERMIT = 'kermit.explorer.accumulatenetwork.io';
const FOZZIE = 'fozzie.explorer.accumulatenetwork.io';
const MAINNET = 'explorer.accumulatenetwork.io';

describe('networkFromSearch', () => {
  it('reads a known network from the query string', () => {
    expect(networkFromSearch('?network=kermit')).toBe('kermit');
    expect(networkFromSearch('?foo=1&network=mainnet')).toBe('mainnet');
  });

  it('is case-insensitive, as getNetwork is', () => {
    expect(networkFromSearch('?network=Kermit')).toBe('kermit');
  });

  it('resolves a reserved network, as a pinned build and a host do', () => {
    // Fozzie is configured but not installed. It stays resolvable so a link
    // naming it is honoured and fails at the API, rather than silently
    // showing a different network's data.
    expect(networkFromSearch('?network=fozzie')).toBe('fozzie');
  });

  it('ignores a name that is not a network', () => {
    expect(networkFromSearch('?network=nope')).toBeUndefined();
    expect(networkFromSearch('?network=')).toBeUndefined();
    expect(networkFromSearch('')).toBeUndefined();
  });
});

describe('unknownNetworkParam', () => {
  it('reports an unrecognised name so it is not silently ignored', () => {
    expect(unknownNetworkParam('?network=nope')).toBe('nope');
  });

  it('reports nothing when the name is a network, or absent', () => {
    expect(unknownNetworkParam('?network=kermit')).toBeUndefined();
    expect(unknownNetworkParam('')).toBeUndefined();
  });
});

describe('ambientNetworkName', () => {
  it('lets a network-specific host name its own network', () => {
    expect(ambientNetworkName(KERMIT)).toBe('kermit');
    expect(ambientNetworkName(FOZZIE)).toBe('fozzie');
    expect(ambientNetworkName('kermit.explorer.accumulate.org')).toBe('kermit');
  });

  it('falls back to mainnet everywhere else', () => {
    expect(ambientNetworkName(MAINNET)).toBe('mainnet');
    expect(ambientNetworkName('localhost')).toBe('mainnet');
    expect(ambientNetworkName('127.0.0.1')).toBe('mainnet');
    expect(ambientNetworkName('beta.explorer.accumulatenetwork.io')).toBe(
      'mainnet',
    );
    expect(ambientNetworkName('')).toBe('mainnet');
  });
});

describe('defaultNetworkName', () => {
  it('lets the URL force a network from any host', () => {
    // The point of the feature: a document can name the network it means,
    // without knowing which host the reader opens it on.
    expect(defaultNetworkName('?network=kermit', MAINNET)).toBe('kermit');
    expect(defaultNetworkName('?network=mainnet', KERMIT)).toBe('mainnet');
    expect(defaultNetworkName('?network=kermit', 'localhost')).toBe('kermit');
  });

  it('falls back to the host when the link names no network', () => {
    expect(defaultNetworkName('', KERMIT)).toBe('kermit');
    expect(defaultNetworkName('', FOZZIE)).toBe('fozzie');
  });

  it('falls back to mainnet when neither the link nor the host names one', () => {
    expect(defaultNetworkName('', MAINNET)).toBe('mainnet');
    expect(defaultNetworkName('', 'localhost')).toBe('mainnet');
    expect(defaultNetworkName('', '')).toBe('mainnet');
  });

  it('falls through on an unrecognised name rather than failing', () => {
    expect(defaultNetworkName('?network=nope', KERMIT)).toBe('kermit');
    expect(defaultNetworkName('?network=nope', MAINNET)).toBe('mainnet');
  });

  it('does not consult storage at all (#84)', () => {
    // The regression guard. Both keys are set to a network other than the one
    // the link and host name; neither may change the answer.
    localStorage.setItem('selectedNetwork', JSON.stringify('mainnet'));
    localStorage.setItem('networkName', JSON.stringify('mainnet'));
    try {
      expect(defaultNetworkName('', KERMIT)).toBe('kermit');
      expect(defaultNetworkName('?network=kermit', MAINNET)).toBe('kermit');
    } finally {
      localStorage.clear();
    }
  });

  it('does not write to storage', () => {
    localStorage.setItem('selectedNetwork', JSON.stringify('mainnet-beta'));
    defaultNetworkName('?network=kermit', KERMIT);
    expect(localStorage.getItem('selectedNetwork')).toBe(
      JSON.stringify('mainnet-beta'),
    );
    localStorage.clear();
  });
});

describe('withNetworkParam', () => {
  it('names the network when the host does not', () => {
    expect(withNetworkParam('/acc/alice.acme', '', 'kermit', MAINNET)).toBe(
      '/acc/alice.acme?network=kermit',
    );
  });

  it('leaves it off when the host already names it', () => {
    // Redundant on kermit.explorer, so the URL stays clean.
    expect(withNetworkParam('/acc/alice.acme', '', 'kermit', KERMIT)).toBe(
      '/acc/alice.acme',
    );
    expect(withNetworkParam('/acc/alice.acme', '', 'mainnet', MAINNET)).toBe(
      '/acc/alice.acme',
    );
  });

  it('drops a parameter that has become redundant', () => {
    expect(
      withNetworkParam('/tx/abc', '?network=mainnet', 'mainnet', MAINNET),
    ).toBe('/tx/abc');
  });

  it('replaces a parameter naming a different network', () => {
    expect(
      withNetworkParam('/tx/abc', '?network=mainnet', 'kermit', MAINNET),
    ).toBe('/tx/abc?network=kermit');
  });

  it('keeps the page’s own query parameters', () => {
    // MinorBlocks and the search form carry their own; dropping them would
    // reset the reader's place.
    expect(withNetworkParam('/blocks', '?from=42', 'kermit', MAINNET)).toBe(
      '/blocks?from=42&network=kermit',
    );
    expect(withNetworkParam('/blocks', '?from=42', 'mainnet', MAINNET)).toBe(
      '/blocks?from=42',
    );
  });
});
