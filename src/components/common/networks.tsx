export interface NetworkConfig {
  id: string;
  label: string;
  mainnet?: boolean;
  explorer?: string;
  api: string[];
  eth?: string[];
  metrics?: string;
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

export const MainnetBeta: NetworkConfig = {
  id: 'mainnet-beta',
  label: 'Mainnet (Beta)',
  mainnet: true,
  explorer: 'https://beta.explorer.accumulatenetwork.io',
  api: ['https://beta.mainnet.accumulatenetwork.io'],
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
};

export const Fozzie: NetworkConfig = {
  id: 'fozzie',
  label: 'Fozzie Testnet',
  explorer: 'https://fozzie.explorer.accumulatenetwork.io',
  api: ['https://fozzie.accumulatenetwork.io'],
};

const Local: NetworkConfig = {
  id: 'local',
  label: 'Local Devnet',
  api: ['http://localhost:26660'],
  eth: ['http://localhost:26660/eth'],
};

const networks = { Mainnet, MainnetBeta, Kermit, Fozzie, Local };

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
