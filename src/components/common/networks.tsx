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
