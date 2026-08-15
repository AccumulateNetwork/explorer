// Type-only, so it is erased and does not pull ethers into this module.
import type { Eip1193Provider } from 'ethers';
import { useContext, useEffect, useMemo, useRef } from 'react';

import { Network } from '../common/Network';
import { NetworkConfig } from '../common/networks';

// The v4-era modal surface this component relies on. @web3modal/ethers v5
// types createWeb3Modal as AppKit and no longer declares these members,
// though they still exist at runtime. Remove with the Reown migration.
interface Web3Modal {
  getWalletProvider(): Eip1193Provider | undefined;
  subscribeProvider(
    cb: (state: { provider?: Eip1193Provider; error?: unknown }) => void,
  ): () => void;
  subscribeState(cb: (state: { open: boolean }) => void): () => void;
  open(opts?: { view: string }): Promise<void>;
  disconnect(): void;
}

/** What callers need from WalletConnect, without holding the modal itself. */
export interface WalletConnectHandle {
  connect(opts: { headless?: boolean }): Promise<Eip1193Provider | undefined>;
  disconnect(): void;
}

/**
 * WalletConnect, built on first use rather than on mount.
 *
 * This used to construct the modal in an effect, which meant every visitor
 * paid for the whole web3modal/WalletConnect stack — and an eth_chainId
 * round trip — on every page load, whether or not they owned a wallet (#49).
 *
 * Availability is a property of the network rather than something to probe:
 * WalletConnect needs an eth endpoint, and `getChainID` returns nothing
 * without one. So the button's enabled state is known synchronously and the
 * stack is only imported when someone actually connects.
 */
export function useWalletConnect(): [WalletConnectHandle | null] {
  const { network } = useContext(Network);
  const available = !!network?.eth?.length;
  const pending = useRef<Promise<WalletConnect> | null>(null);

  // A modal is bound to one chain; drop it if the network changes.
  useEffect(() => {
    pending.current = null;
  }, [network?.id]);

  const handle = useMemo<WalletConnectHandle | null>(() => {
    if (!available) {
      return null;
    }
    const modal = () => (pending.current ??= WalletConnect.create(network));
    return {
      connect: (opts) => modal().then((m) => m.connect(opts)),
      disconnect: () => {
        pending.current?.then((m) => m.disconnect()).catch(() => {});
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, network?.id]);

  return [handle];
}

/** The chain id of the network's eth endpoint. Kept here so this module does
 * not import Driver, which would pull ethers back into the eager graph. */
async function getChainID(network: NetworkConfig): Promise<string | undefined> {
  if (!network?.eth?.length) {
    return;
  }
  const r = await fetch(network.eth[0], {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_chainId',
      params: {},
    }),
  }).then((r) => r.json());
  return r?.result;
}

class WalletConnect {
  static readonly projectId = '87d71f5b1e0cc9b87ea7c38d85b43b4a';

  readonly modal: Web3Modal;

  /** Import the stack and build the modal. Only called on first connect. */
  static async create(network: NetworkConfig): Promise<WalletConnect> {
    const chainId = await getChainID(network);
    if (typeof chainId !== 'string') {
      throw new Error('The network did not report a chain id');
    }
    const { createWeb3Modal, defaultConfig } = await import(
      '@web3modal/ethers'
    );
    return new WalletConnect(network, Number(chainId), {
      createWeb3Modal,
      defaultConfig,
    });
  }

  private constructor(
    network: NetworkConfig,
    chainId: number,
    { createWeb3Modal, defaultConfig }: typeof import('@web3modal/ethers'),
  ) {
    this.modal = createWeb3Modal({
      projectId: '87d71f5b1e0cc9b87ea7c38d85b43b4a',
      enableAnalytics: false,
      chains: [
        {
          chainId: Number(chainId),
          name: `Accumulate ${network.label}`,
          currency: 'ACME',
          explorerUrl:
            network.explorer || 'https://explorer.accumulatenetwork.io',
          rpcUrl: network.eth[0],
        },
      ],
      ethersConfig: defaultConfig({
        auth: {
          email: false,
        },
        metadata: {
          name: 'Accumulate Explorer',
          description: 'Accumulate Explorer',
          url: location.origin,
          icons: [`${location.origin}/static/media/logo.64085dfd.svg`],
        },
        enableInjected: false,
        enableCoinbase: false,
      }),
    }) as unknown as Web3Modal;
  }

  async connect({
    headless,
  }: {
    headless?: boolean;
  }): Promise<Eip1193Provider | undefined> {
    const provider = this.modal.getWalletProvider();
    if (provider || headless) {
      return provider;
    }

    const unsub: (() => void)[] = [];
    try {
      return await new Promise<Eip1193Provider | undefined>(async (r, j) => {
        unsub.push(
          this.modal.subscribeProvider(({ provider, error }) => {
            if (error) {
              j(error);
            } else {
              r(provider);
            }
          }),
        );
        unsub.push(
          this.modal.subscribeState(({ open }) => {
            if (!open) {
              r(undefined);
            }
          }),
        );
        await this.modal.open({ view: 'Connect' });
      });
    } finally {
      unsub.forEach((x) => x());
    }
  }

  disconnect() {
    this.modal.disconnect();
  }
}
