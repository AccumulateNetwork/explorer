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
    // Deliberately not persisted here. This runs on every construction —
    // including the one that merely applied a hostname default — which made
    // a network the user never chose look like an explicit choice (#73).
    // Only an explicit selection is stored; see Explorer's onSelectNetwork.
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

    const ageSeconds = (Date.now() - (r.lastBlockTime?.getTime() || 0)) / 1000;
    if (ageSeconds > 60) {
      throw new Error(`Response is too old: ${r.lastBlockTime}`);
    }

    return { url: u, part: p, ledger: r.account };
  };

  const [ok] = useAsyncState(async () => {
    if (!ctx) {
      return;
    }

    try {
      const { network } = await ctx.api.networkStatus({});
      const p = network.partitions;

      const [anchors, synth] = await Promise.all([
        Promise.all(p.map((x) => get(x, 'anchors', AnchorLedger))),
        Promise.all(p.map((x) => get(x, 'synthetic', SyntheticLedger))),
      ]);

      // Use larger threshold for local devnets (they may have larger lags when idle)
      const threshold = ctx.network.id === 'local' ? 50 : okThreshold;
      return anchorsOk(anchors, threshold) && syntheticOk(synth, threshold);
    } catch (error) {
      // Status badge is a background health check — log but don't trigger the
      // global "API call failed" toast, which users see as spam when the
      // dropdown probes every network at once.
      console.error(error);
      return false;
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

function anchorsOk(
  ledgers: LedgerInfo<AnchorLedger>[],
  threshold = okThreshold,
) {
  for (const a of ledgers) {
    for (const b of ledgers) {
      if (
        a.part.type !== PartitionType.Directory &&
        b.part.type !== PartitionType.Directory
      ) {
        continue;
      }
      const ba = b.ledger.sequence?.find((x) => x.url.equals(a.url));
      if (!ba || a.ledger.minorBlockSequenceNumber - ba.delivered > threshold) {
        return false;
      }
    }
  }
  return true;
}

function syntheticOk(
  ledgers: LedgerInfo<SyntheticLedger>[],
  threshold = okThreshold,
) {
  for (const a of ledgers) {
    for (const b of ledgers) {
      const ab = a.ledger.sequence?.find((x) => x.url.equals(b.url));
      const ba = b.ledger.sequence?.find((x) => x.url.equals(a.url));
      if (!ab && !ba) continue;
      // For devnets, skip if only one direction exists (not fully bidirectional yet)
      if (!ab || !ba) continue;

      // Measure cross-partition delivery lag, not execution backlog: compare
      // what B produced for A against what A has *received* from B. Using
      // 'delivered' here counts synthetic txns that arrived but haven't yet
      // executed as if the network were down — on a long-running network like
      // mainnet that backlog is permanent, so it wrongly shows as not-live.
      if (ba.produced != null && ab.received != null) {
        if (ba.produced - ab.received > threshold) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * The network to open on, absent an explicit choice.
 *
 * Takes the stored selection and hostname as parameters so it can be tested
 * without a DOM or storage; both default to the live values.
 *
 * A stored selection only means something if the user actually made one,
 * which is why {@link Settings.networkName} defaults to empty rather than
 * 'mainnet'. While the two were the same value, this function returned at
 * the first branch on every fresh browser and the hostname defaults below
 * were unreachable — so kermit.explorer opened on Mainnet and its deep links
 * appeared not to exist (#73).
 */
export function defaultNetworkName(
  stored: string = Settings.networkName,
  hostname: string = typeof window !== 'undefined'
    ? window.location.hostname
    : '',
): string {
  if (import.meta.env.VITE_APP_API_PATH) {
    return import.meta.env.VITE_APP_API_PATH;
  }
  // A build pinned to one network (VITE_NETWORK=kermit) always wins.
  if (!Context.canChangeNetwork && import.meta.env.VITE_NETWORK) {
    return import.meta.env.VITE_NETWORK;
  }

  // Honor the user's last explicit selection if it's still a known network.
  // An unknown one (a network since removed) is ignored, not cleared: this
  // function has no side effects.
  if (stored && getNetwork(stored)) {
    return stored;
  }

  // No explicit choice — a network-specific host names its own network.
  // localhost is deliberately absent: it would point development and the
  // smoke script at a devnet that is usually not running. Pin it explicitly
  // with VITE_NETWORK=local, or switch networks in the UI.
  if (hostname.includes('kermit.explorer')) return 'kermit';
  if (hostname.includes('fozzie.explorer')) return 'fozzie';
  return 'mainnet';
}

export const Network = Object.assign(
  React.createContext<Context>(new Context()),
  { Context, Status },
);
