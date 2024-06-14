import { Badge } from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { URL } from 'accumulate.js';
import { JsonRpcClient } from 'accumulate.js/lib/api_v3';
import {
  Account,
  AnchorLedger,
  PartitionInfo,
  PartitionType,
  SyntheticLedger,
} from 'accumulate.js/lib/core';

import { Ctor, isRecordOf } from '../../utils/types';
import { Settings } from '../explorer/Settings';
import { NetworkConfig, getNetwork } from './networks';
import { useAsyncState } from './useAsync';

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

interface LedgerInfo<T> {
  url: URL;
  part: PartitionInfo;
  ledger: T;
}

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

const DN = URL.parse('dn.acme');

export function Status(props: {
  network?: NetworkConfig;
  text: React.ReactNode;
}) {
  const shared = useContext(Network);
  const [ctx, setCtx] = useState<Context>();

  useEffect(() => {
    if (props.network?.id === shared.network.id) {
      setCtx(shared);
    } else {
      setCtx(new Context(shared.onApiError, props.network));
    }
  }, [props.network?.id]);

  const [ok] = useAsyncState(async () => {
    if (!ctx) {
      return;
    }

    const get = async <C extends Ctor<Account>>(
      p: PartitionInfo,
      path: string,
      c: C,
    ): Promise<LedgerInfo<InstanceType<C>>> => {
      const u =
        p.type === PartitionType.Directory ? DN : URL.parse(`bvn-${p.id}.acme`);
      const r = await ctx.api.query(u.join(path));
      if (!isRecordOf(r, c)) {
        throw new Error(`${u}/${path} is not a ${c.name}`);
      }
      return { url: u, part: p, ledger: r.account };
    };

    try {
      const { network } = await ctx.api.networkStatus({});
      const p = network.partitions;

      const [anchors, synth] = await Promise.all([
        Promise.all(p.map((x) => get(x, 'anchors', AnchorLedger))),
        Promise.all(p.map((x) => get(x, 'synthetic', SyntheticLedger))),
      ]);

      return anchorsOk(anchors) && syntheticOk(synth);
    } catch (error) {
      shared.onApiError(error);
    }
  }, [ctx?.network?.id]);

  if (typeof ok !== 'boolean') {
    return <Badge status="default" text={props.text} />;
  }

  if (!ok) {
    return <Badge status="warning" text={props.text} />;
  }
  return <Badge status="success" text={props.text} />;
}

// The number of anchors or synthetic messages that can be behind before it's
// considered not ok.
const okThreshold = 10;

function anchorsOk(ledgers: LedgerInfo<AnchorLedger>[]) {
  for (const a of ledgers) {
    for (const b of ledgers) {
      if (
        a.part.type !== PartitionType.Directory &&
        b.part.type !== PartitionType.Directory
      ) {
        continue;
      }
      const ba = b.ledger.sequence.find((x) => x.url.equals(a.url));
      if (
        !ba ||
        a.ledger.minorBlockSequenceNumber - ba.delivered > okThreshold
      ) {
        return false;
      }
    }
  }
  return true;
}

function syntheticOk(ledgers: LedgerInfo<SyntheticLedger>[]) {
  for (const a of ledgers) {
    for (const b of ledgers) {
      const ab = a.ledger.sequence.find((x) => x.url.equals(b.url));
      const ba = b.ledger.sequence.find((x) => x.url.equals(a.url));
      if (!ab && !ba) continue;
      if (!ab || !ba) return false;
      if (ab.produced - ba.delivered > okThreshold) {
        return false;
      }
    }
  }
  return true;
}

function defaultNetworkName(): string {
  if (import.meta.env.VITE_APP_API_PATH) {
    return import.meta.env.VITE_APP_API_PATH;
  }
  if (!Context.canChangeNetwork) {
    return import.meta.env.VITE_NETWORK;
  }
  return Settings.networkName || 'mainnet';
}

export const Network = Object.assign(
  React.createContext<Context>(new Context()),
  { Context, Status },
);
