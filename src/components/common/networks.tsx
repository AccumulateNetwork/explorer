export interface Network {
  id: string;
  label: string;
  mainnet: boolean;
  explorer: string;
  api: string[];
}

export const Mainnet: Network = {
  id: 'mainnet',
  label: 'Mainet',
  mainnet: true,
  explorer: 'https://explorer.accumulatenetwork.io',
  api: [
    'https://mainnet.accumulatenetwork.io',
    'https://api-gateway.accumulate.defidevs.io',
  ],
};

export const Kermit: Network = {
  id: 'kermit',
  label: 'Kermit Testnet',
  mainnet: false,
  explorer: 'https://kermit.explorer.accumulatenetwork.io',
  api: [
    'https://kermit.accumulatenetwork.io',
    'https://testnet.accumulatenetwork.io',
  ],
};

export const Fozzie: Network = {
  id: 'fozzie',
  label: 'Fozzie Testnet',
  mainnet: false,
  explorer: 'https://fozzie.explorer.accumulatenetwork.io',
  api: ['https://fozzie.accumulatenetwork.io'],
};

const networks = { Mainnet, Kermit, Fozzie };

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
