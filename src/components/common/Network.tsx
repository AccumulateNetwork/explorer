import { Badge } from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

/** The query parameter a link uses to name the network it means. */
export const NETWORK_PARAM = 'network';

/**
 * The network named in a URL's query string, if it names a known one.
 *
 * An unrecognised value resolves to nothing rather than failing the page, so
 * a typo degrades to the ordinary default; {@link unknownNetworkParam} reports
 * it so it is not silently ignored.
 */
export function networkFromSearch(search: string): string | undefined {
  if (!search) {
    return undefined;
  }
  const name = new URLSearchParams(search).get(NETWORK_PARAM);
  return name && getNetwork(name) ? getNetwork(name).id : undefined;
}

/** A `network` parameter that names nothing, for reporting to the user. */
export function unknownNetworkParam(search: string): string | undefined {
  if (!search) {
    return undefined;
  }
  const name = new URLSearchParams(search).get(NETWORK_PARAM);
  return name && !getNetwork(name) ? name : undefined;
}

/**
 * The network a URL resolves to when it does not name one: the build it was
 * pinned to, else the host, else mainnet.
 *
 * This is what a link carrying no `?network=` means, and what
 * {@link defaultNetworkName} falls back to. Exported so the app can tell
 * whether the parameter needs to be in the URL at all — on kermit.explorer it
 * does not, because the host already says so.
 */
export function ambientNetworkName(
  hostname: string = typeof window !== 'undefined'
    ? window.location.hostname
    : '',
): string {
  if (import.meta.env.VITE_APP_API_PATH) {
    return import.meta.env.VITE_APP_API_PATH;
  }
  // A build pinned to one network (VITE_NETWORK=kermit) always wins: it is a
  // property of the deployment, not of the link.
  if (!Context.canChangeNetwork && import.meta.env.VITE_NETWORK) {
    return import.meta.env.VITE_NETWORK;
  }

  // A network-specific host names its own network. localhost is deliberately
  // absent: it would point development and the smoke script at a devnet that
  // is usually not running. Pin it with VITE_NETWORK=local, or name it in the
  // URL.
  if (hostname.includes('kermit.explorer')) return 'kermit';
  if (hostname.includes('fozzie.explorer')) return 'fozzie';
  return 'mainnet';
}

/**
 * The network to open on.
 *
 * Precedence, highest first:
 *
 * 1. a build pinned with `VITE_NETWORK`, an infrastructure fact
 * 2. **`?network=` in the URL**
 * 3. a network-specific hostname
 * 4. mainnet
 *
 * The reader's stored selection is deliberately absent. It used to sit above
 * the hostname, so anyone who had ever used the network selector overrode
 * every network-specific deep link they were given — `kermit.explorer/tx/…`
 * opened on Mainnet for them, which is the same symptom as #73 arriving by a
 * different route. A link has to mean the same thing for every reader, so
 * what resolves it is the link, never the reader (#84).
 *
 * Takes the query string and hostname as parameters so it can be tested
 * without a DOM; both default to the live values. It has no side effects and
 * reads no storage.
 */
export function defaultNetworkName(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  hostname: string = typeof window !== 'undefined'
    ? window.location.hostname
    : '',
): string {
  if (import.meta.env.VITE_APP_API_PATH) {
    return import.meta.env.VITE_APP_API_PATH;
  }
  if (!Context.canChangeNetwork && import.meta.env.VITE_NETWORK) {
    return import.meta.env.VITE_NETWORK;
  }
  return networkFromSearch(search) ?? ambientNetworkName(hostname);
}

/**
 * The same path with the network named, or not, according to whether the URL
 * has to carry it. On a host that already names the network the parameter is
 * redundant and is left off.
 */
export function withNetworkParam(
  pathname: string,
  search: string,
  networkID: string,
  hostname?: string,
): string {
  const params = new URLSearchParams(search);
  if (networkID === ambientNetworkName(hostname)) {
    params.delete(NETWORK_PARAM);
  } else {
    params.set(NETWORK_PARAM, networkID);
  }
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/**
 * Keeps the network in the URL as the reader moves around.
 *
 * A forced network has to survive a click, and a URL copied from a later page
 * has to still name it — otherwise the link works once and then silently
 * reverts to whatever the next reader defaults to. Doing that at each call
 * site would mean touching a dozen navigations and would rot the moment a
 * thirteenth was added, so it is enforced here instead: after any navigation,
 * the parameter is put back.
 *
 * It also lets the URL win over the running app. Editing `?network=` by hand,
 * or following a link into an already-open tab, names a network the Context
 * was not built for; the Context is built once per load, so the honest
 * response is to load again.
 */
function KeepNetworkParam() {
  const shared = useContext(Network);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const named = networkFromSearch(location.search);
    if (named && named !== shared.network.id) {
      // The URL names a different network than this Context serves.
      window.location.reload();
      return;
    }
    if (named) {
      return;
    }
    const wanted = withNetworkParam(
      location.pathname,
      location.search,
      shared.network.id,
    );
    if (wanted !== location.pathname + location.search) {
      navigate(wanted, { replace: true });
    }
  }, [location.pathname, location.search, shared.network.id]);

  return null;
}

export const Network = Object.assign(
  React.createContext<Context>(new Context()),
  { Context, Status, KeepParam: KeepNetworkParam },
);
