import { describe, expect, it } from 'vitest';

import { Settings } from '../explorer/Settings';
import { defaultNetworkName } from './Network';

// A stored network only means something if the user actually chose one.
// While Settings.selectedNetwork defaulted to 'mainnet', "unset" and "chose
// mainnet" were the same value, so the first branch always returned and the
// hostname defaults were unreachable: kermit.explorer opened on Mainnet and
// its deep links appeared not to exist (#73).

const KERMIT = 'kermit.explorer.accumulatenetwork.io';
const FOZZIE = 'fozzie.explorer.accumulatenetwork.io';
const MAINNET = 'explorer.accumulatenetwork.io';

describe('defaultNetworkName', () => {
  describe('with no stored selection', () => {
    it('opens a kermit host on kermit (#73)', () => {
      expect(defaultNetworkName('', KERMIT)).toBe('kermit');
    });

    it('opens a fozzie host on fozzie', () => {
      expect(defaultNetworkName('', FOZZIE)).toBe('fozzie');
    });

    it('opens the mainnet host on mainnet', () => {
      expect(defaultNetworkName('', MAINNET)).toBe('mainnet');
    });

    it('matches the alternate kermit domain', () => {
      expect(defaultNetworkName('', 'kermit.explorer.accumulate.org')).toBe(
        'kermit',
      );
    });

    it('falls back to mainnet for an unrecognized host', () => {
      expect(defaultNetworkName('', 'localhost')).toBe('mainnet');
      expect(defaultNetworkName('', '127.0.0.1')).toBe('mainnet');
      expect(defaultNetworkName('', 'beta.explorer.accumulatenetwork.io')).toBe(
        'mainnet',
      );
      expect(defaultNetworkName('', '')).toBe('mainnet');
    });
  });

  describe('with an explicit selection', () => {
    it('honors it over the hostname', () => {
      // Someone on the Kermit host who deliberately switched to mainnet
      // stays on mainnet.
      expect(defaultNetworkName('mainnet', KERMIT)).toBe('mainnet');
      expect(defaultNetworkName('kermit', MAINNET)).toBe('kermit');
    });

    it('ignores a network that no longer exists', () => {
      expect(defaultNetworkName('mainnet-beta', KERMIT)).toBe('kermit');
      expect(defaultNetworkName('mainnet-beta', MAINNET)).toBe('mainnet');
    });
  });

  it('does not write to storage', () => {
    // The old implementation cleared an unknown stored value, and the
    // Context constructor persisted on every construction — together they
    // made a network nobody chose look like a choice.
    localStorage.setItem('selectedNetwork', JSON.stringify('mainnet-beta'));
    defaultNetworkName('mainnet-beta', KERMIT);
    expect(localStorage.getItem('selectedNetwork')).toBe(
      JSON.stringify('mainnet-beta'),
    );
  });

  it('reads an empty store as no selection, not as mainnet (#73)', () => {
    // The regression guard for the actual defect: while the setting
    // defaulted to 'mainnet', a fresh browser was indistinguishable from a
    // user who had chosen mainnet, and every hostname default below was
    // dead code.
    localStorage.clear();
    expect(Settings.selectedNetwork).toBe('');
    expect(defaultNetworkName(Settings.selectedNetwork, KERMIT)).toBe('kermit');
  });

  it('ignores the retired networkName key (#73)', () => {
    // Every browser that visited a network-specific host before the fix
    // carries networkName="mainnet", written by the old code rather than
    // chosen. Honoring it would leave those users on Mainnet forever, so
    // the key is retired and swept.
    localStorage.clear();
    localStorage.setItem('networkName', JSON.stringify('mainnet'));
    expect(Settings.selectedNetwork).toBe('');
    expect(defaultNetworkName(Settings.selectedNetwork, KERMIT)).toBe('kermit');
  });
});
