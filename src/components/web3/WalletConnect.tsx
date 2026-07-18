import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';
import { Eip1193Provider } from 'ethers';
import { useContext, useState } from 'react';

import { Network } from '../common/Network';
import { NetworkConfig } from '../common/networks';
import { useAsyncEffect } from '../common/useAsync';
import { Driver } from './Driver';

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

export function useWalletConnect() {
  const { network } = useContext(Network);
  const [modal, setModal] = useState<WalletConnect>(null);

  useAsyncEffect(
    async (mounted) => {
      const chainId = await Driver.getChainID(network);
      if (typeof chainId !== 'string' || !mounted()) {
        return;
      }

      setModal(new WalletConnect(network, Number(chainId)));
    },
    [network],
  );

  return [modal];
}

class WalletConnect {
  static readonly projectId = '87d71f5b1e0cc9b87ea7c38d85b43b4a';

  readonly modal: Web3Modal;

  constructor(network: NetworkConfig, chainId: number) {
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
