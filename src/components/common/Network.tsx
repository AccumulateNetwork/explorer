import React from 'react';

import { JsonRpcClient } from 'accumulate.js/lib/api_v3';

import { Settings } from '../explorer/Settings';
import { NetworkConfig, getNetwork } from './networks';

type BroadcastMessage = DidChangeNetwork | DidChangeSetting;

interface DidChangeNetwork {
  type: 'didChangeNetwork';
  networkID: string;
}

interface DidChangeSetting {
  type: 'didChangeSetting';
  name: string;
}

const broadcast = new BroadcastChannel('shared-broadcast');
const broadcastListeners = [];

export class Context {
  static readonly canChangeNetwork =
    `${import.meta.env.VITE_NETWORK}`.toLowerCase() === 'any';
  readonly canChangeNetwork = Context.canChangeNetwork;

  #onApiError?: (_: any) => void;
  readonly #network?: NetworkConfig;
  readonly #api?: JsonRpcClient;

  constructor(
    onApiError?: (_: any) => void,
    name: string | NetworkConfig = defaultNetworkName(),
  ) {
    if (!name) {
      throw new Error(
        'specify a network with the VITE_NETWORK environment variable',
      );
    }
    const network = typeof name === 'string' ? getNetwork(name) : name;
    if (!network) {
      throw new Error(`unknown network ${name}`);
    }

    this.#onApiError = onApiError;
    this.#network = network;
    this.#api = new JsonRpcClient(`${network.api[0]}/v3`);
    Settings.networkName = network.api[0];
  }

  get network() {
    return this.#network;
  }

  get api() {
    return this.#api;
  }

  get onApiError() {
    return this.#onApiError || ((e) => console.error(e));
  }

  static postBroadcast(message: BroadcastMessage) {
    broadcast.postMessage(message);
    broadcastListeners.forEach((fn) => {
      try {
        fn(message);
      } catch (error) {
        console.log(error);
      }
    });
  }

  static onBroadcast(fn: (message: BroadcastMessage) => void) {
    // Get messages from this window
    broadcastListeners.push(fn);

    // Get messages from other windows
    broadcast.addEventListener('message', (msg) => fn(msg.data));
  }
}

export const Network = Object.assign(
  React.createContext<Context>(new Context()),
  {
    Context,
  },
);

function defaultNetworkName(): string {
  if (import.meta.env.VITE_APP_API_PATH) {
    return import.meta.env.VITE_APP_API_PATH;
  }
  if (!Context.canChangeNetwork) {
    return import.meta.env.VITE_NETWORK;
  }
  return Settings.networkName || 'mainnet';
}
