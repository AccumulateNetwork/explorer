import React from 'react';

import { JsonRpcClient } from 'accumulate.js/lib/api_v3';

import networks, { Network, getNetwork } from './networks';

export class Context {
  readonly onApiError: (_: any) => void;

  #network?: Network;
  #api?: JsonRpcClient;

  constructor({
    network,
    onApiError = (e) => console.error(e),
  }: {
    network?: string;
    onApiError?: (_: any) => void;
  }) {
    if (network) {
      this.setNetwork(network);
    }
    this.onApiError = onApiError;
  }

  get network() {
    return this.#network;
  }

  get api() {
    return this.#api;
  }

  setNetwork(network: string) {
    this.#network = getNetwork(network);
    if (!this.#network) {
      throw new Error(`unknown network ${network}`);
    }
    this.#api = new JsonRpcClient(`${this.#network.api[0]}/v3`);
  }
}

export const Shared = Object.assign(
  React.createContext<Context>(new Context({})),
  {
    Context,
  },
);
