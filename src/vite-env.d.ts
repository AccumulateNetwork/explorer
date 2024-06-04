/// <reference types="vite/client" />
import type { MetaMaskInpageProvider } from '@metamask/providers';
import type { provider } from 'web3-core';

declare global {
  interface Window {
    ethereum?: provider & MetaMaskInpageProvider;
  }
}
