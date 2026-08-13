import { describe, expect, it } from 'vitest';

import networks, { getNetwork, offeredNetworks } from './networks';

// A network that is configured is not necessarily installed. Fozzie is held
// in reserve: its API does not answer, so offering it in the menu only buys
// the user failed queries — but it stays configured, because a pinned build,
// a hostname default or a stored selection must still resolve it.

describe('offeredNetworks', () => {
  it('omits reserved networks', () => {
    const ids = offeredNetworks().map((x) => x.id);
    expect(ids).not.toContain('fozzie');
  });

  it('offers the installed ones', () => {
    const ids = offeredNetworks().map((x) => x.id);
    expect(ids).toContain('mainnet');
    expect(ids).toContain('kermit');
  });

  it('drops exactly the networks flagged reserved', () => {
    const reserved = Object.values(networks)
      .filter((x) => x.reserved)
      .map((x) => x.id);
    const offered = offeredNetworks().map((x) => x.id);
    expect(offered).toEqual(
      Object.values(networks)
        .map((x) => x.id)
        .filter((id) => !reserved.includes(id)),
    );
  });
});

describe('getNetwork', () => {
  it('still resolves a reserved network', () => {
    // Reserved means "not offered", not "unknown": a fozzie.explorer host,
    // a VITE_NETWORK=fozzie build, or a stored selection must all still work
    // if it is brought back.
    expect(getNetwork('fozzie')?.id).toBe('fozzie');
  });

  it('resolves by id and by API endpoint', () => {
    expect(getNetwork('mainnet')?.id).toBe('mainnet');
    expect(getNetwork('https://kermit.accumulatenetwork.io')?.id).toBe(
      'kermit',
    );
  });

  it('returns undefined for an unknown network', () => {
    expect(getNetwork('mainnet-beta')).toBeUndefined();
  });
});
