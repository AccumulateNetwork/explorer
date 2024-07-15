/// <reference types="vite/client" />
import type { MetaMaskInpageProvider } from '@metamask/providers';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & MetaMaskInpageProvider;
  }
}
