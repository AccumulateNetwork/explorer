import { createContext, useContext } from 'react';

import type { LiteIdentity } from 'accumulate.js/lib/core';

import type { Driver, EthPublicKey } from './Driver';
import type { Linked } from './Linked';
import type { OnlineStore } from './OnlineStore';
import type { Store } from './Store';

export namespace Context {
  export interface Account {
    address: string;
    liteIdentity: LiteIdentity;
    exists: boolean;
    publicKey?: EthPublicKey;

    /**
     * This is a copy of {@link Context.driver} for convenience.
     */
    driver: Driver;
  }
}

export interface Context {
  connect: () => Promise<Context>;
  login: (_: Context.Account) => Promise<Context>;
  disconnect: () => void;
  reload: (rq: ReloadRequest) => void;

  canConnect: boolean;
  connected: boolean;

  driver?: Driver;
  dataStore?: Store;
  onlineStore?: OnlineStore;
  accounts: Context.Account[];
  linked?: Linked;
}

export interface ReloadRequest {
  liteIdentity?: boolean;
  dataStore?: boolean;
}

const reactContext = createContext<Context>({
  connect: () => Promise.reject(),
  login: () => Promise.reject(),
  disconnect() {},
  reload() {},
  canConnect: false,
  connected: false,
  accounts: [],
});

export const { Provider } = reactContext;

export function useWeb3() {
  return useContext(reactContext);
}
