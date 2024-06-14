export interface NetworkConfig {
  id: string;
  label: string;
  mainnet?: boolean;
  explorer?: string;
  api: string[];
  metrics?: string;
}

export const Mainnet: NetworkConfig = {
  id: 'mainnet',
  label: 'Mainet',
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
  api: ['http://127.0.1.1:26660'],
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
