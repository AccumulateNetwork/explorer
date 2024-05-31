import React from 'react';

import { JsonRpcClient } from 'accumulate.js/lib/api_v3';

import { Settings } from '../explorer/Settings';
import { Mainnet, Network, getNetwork } from './networks';

function defaultNetworkName(): string {
  if (import.meta.env.VITE_APP_API_PATH) {
    return import.meta.env.VITE_APP_API_PATH;
  }
  if (!Context.canChangeNetwork) {
    return import.meta.env.VITE_NETWORK;
  }
  return Settings.networkName || 'mainnet';
}

export class Context {
  static readonly canChangeNetwork =
    `${import.meta.env.VITE_NETWORK}`.toLowerCase() === 'any';
  readonly canChangeNetwork = Context.canChangeNetwork;

  #onApiError?: (_: any) => void;
  readonly #network?: Network;
  readonly #api?: JsonRpcClient;

  constructor(
    onApiError?: (_: any) => void,
    name: string | Network = defaultNetworkName(),
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
}

export const Shared = Object.assign(
  React.createContext<Context>(new Context()),
  {
    Context,
  },
);
