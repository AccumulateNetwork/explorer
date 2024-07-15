import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';
import { useContext, useState } from 'react';

import { Network } from '../common/Network';
import { useAsyncEffect } from '../common/useAsync';
import { Driver } from './Driver';

export function useWalletConnect() {
  const { network } = useContext(Network);
  const [modal, setModal] = useState<ReturnType<typeof createWeb3Modal>>(null);

  useAsyncEffect(
    async (mounted) => {
      const chainId = await Driver.getChainID(network);
      if (typeof chainId !== 'string' || !mounted()) {
        return;
      }

      setModal(
        createWeb3Modal({
          projectId: '87d71f5b1e0cc9b87ea7c38d85b43b4a',
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
            metadata: {
              name: 'Accumulate Explorer',
              description: 'Accumulate Explorer',
              url: location.origin,
              icons: [`${location.origin}/static/media/logo.64085dfd.svg`],
            },
            enableInjected: false,
            enableCoinbase: false,
          }),
        }),
      );
    },
    [network],
  );

  return [modal];
}
