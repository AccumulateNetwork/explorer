export interface NetworkConfig {
  id: string;
  label: string;
  mainnet?: boolean;
  explorer?: string;
  api: string[];
  eth?: string[];
  metrics?: string;
  /**
   * Configured but not currently installed. Kept so a pinned build, a
   * hostname default or a stored selection still resolves it, but not
   * offered in the network menu — picking a network that is not deployed
   * only yields failed queries.
   */
  reserved?: boolean;
}

export const Mainnet: NetworkConfig = {
  id: 'mainnet',
  label: 'Mainnet',
  mainnet: true,
  explorer: 'https://explorer.accumulatenetwork.io',
  api: [
    'https://mainnet.accumulatenetwork.io',
    'https://api-gateway.accumulate.defidevs.io',
  ],
  metrics: 'https://metrics.accumulatenetwork.io/v1',
};

export const Kermit: NetworkConfig = {
  id: 'kermit',
  label: 'Kermit Testnet',
  explorer: 'https://kermit.explorer.accumulatenetwork.io',
  api: [
    'https://kermit.accumulatenetwork.io',
    'https://testnet.accumulatenetwork.io',
  ],
  eth: ['https://kermit.accumulatenetwork.io/eth'],
};

export const Fozzie: NetworkConfig = {
  id: 'fozzie',
  // Held in reserve, not installed: the API does not answer, though a
  // stale DNS record remains. Drop this line when it is deployed again.
  reserved: true,
  label: 'Fozzie Testnet',
  explorer: 'https://fozzie.explorer.accumulatenetwork.io',
  api: ['https://fozzie.accumulatenetwork.io'],
};

const Local: NetworkConfig = {
  id: 'local',
  label: 'Local Devnet',
  api: ['http://127.0.0.1:26660'],
  eth: ['http://127.0.0.1:26660/eth'],
};

const networks = { Mainnet, Kermit, Fozzie, Local };

/**
 * The networks to offer the user. Reserved networks stay configured and
 * resolvable but are not listed — see {@link NetworkConfig.reserved}.
 */
export function offeredNetworks(): NetworkConfig[] {
  return Object.values(networks).filter((x) => !x.reserved);
}

export function getNetwork(s: string) {
  for (const network of Object.values(networks)) {
    if (
      s.toLowerCase() === network.id ||
      network.api.includes(s.toLowerCase())
    ) {
      return network;
    }
  }
}

export default networks;
