import { createContext, useContext } from 'react';

import type { LiteIdentity } from 'accumulate.js/lib/core';

import type { Driver, EthPublicKey } from './Driver';
import type { Linked } from './Linked';
import type { OnlineStore } from './OnlineStore';
import type { Store } from './Store';

export namespace Context {
  export interface Account {
    active: boolean;
    address: string;
    liteIdentity: LiteIdentity;
    exists: boolean;
    publicKey?: EthPublicKey;
    linked?: Linked;
  }
}

export interface Context {
  connect: () => Promise<Context | null>;
  disconnect: () => void;
  reload: (rq: ReloadRequest) => void;

  canConnect: boolean;
  connected: boolean;

  driver?: Driver;
  dataStore?: Store;
  onlineStore?: OnlineStore;
  accounts: Context.Account[];
}

export interface ReloadRequest {
  liteIdentity?: boolean;
  dataStore?: boolean;
}

const reactContext = createContext<Context>({
  connect: () => Promise.reject(),
  disconnect() {},
  reload() {},
  canConnect: false,
  connected: false,
  driver: null,
  dataStore: null,
  onlineStore: null,
  accounts: [],
});

export const { Provider } = reactContext;

export function useWeb3() {
  return useContext(reactContext);
}
