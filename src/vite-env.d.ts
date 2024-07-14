/// <reference types="vite/client" />
import type { MetaMaskInpageProvider } from '@metamask/providers';
import type { SupportedProviders } from 'web3-types';

declare global {
  interface Window {
    ethereum?: SupportedProviders & MetaMaskInpageProvider;
  }
}
