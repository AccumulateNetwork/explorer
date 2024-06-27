import { createContext, useContext } from 'react';

import type { LiteIdentity } from 'accumulate.js/lib/core';

import type { Driver, EthPublicKey } from './Driver';
import type { Linked } from './Linked';
import type { OnlineStore } from './OnlineStore';
import type { Store } from './Store';

export interface Context {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  reload: (rq: ReloadRequest) => void;
  switch: () => void;

  canConnect: boolean;
  connected: boolean;

  driver: Driver | null;
  publicKey: EthPublicKey | null;
  liteIdentity: LiteIdentity | null;
  dataStore: Store | null;
  onlineStore: OnlineStore | null;
  linked: Linked | null;
}

export interface ReloadRequest {
  liteIdentity?: boolean;
  dataStore?: boolean;
}

const reactContext = createContext<Context>({
  connect: () => Promise.reject(),
  disconnect() {},
  reload() {},
  switch() {},
  canConnect: false,
  connected: false,
  driver: null,
  publicKey: null,
  liteIdentity: null,
  dataStore: null,
  onlineStore: null,
  linked: null,
});

export const { Provider } = reactContext;

export function useWeb3() {
  return useContext(reactContext);
}
