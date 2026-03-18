/**
 * WalletContext - React context for wallet daemon integration
 *
 * Provides wallet state and actions to the explorer components.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { WalletClient, WalletStatus, KeyInfo, VaultInfo, walletClient } from './WalletClient';

export interface WalletContextValue {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;

  // Wallet data
  status: WalletStatus | null;
  activeVault: VaultInfo | null;
  keys: KeyInfo[];

  // Actions
  connect: (endpoint?: string) => Promise<void>;
  disconnect: () => void;
  refreshKeys: () => Promise<void>;
  selectVault: (vaultName: string) => Promise<void>;
  unlockVault: (passphrase: string) => Promise<void>;

  // Signing
  canSign: (publicKeyHash: string) => boolean;
  getSigningKey: (publicKeyHash: string) => KeyInfo | undefined;

  // Settings
  endpoint: string;
  setEndpoint: (endpoint: string) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue | null {
  return useContext(WalletContext);
}

export function useWalletRequired(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWalletRequired must be used within WalletProvider');
  }
  return ctx;
}

interface WalletProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'accumulate-wallet-endpoint';
const DEFAULT_ENDPOINT = 'http://127.0.0.1:8079/v1';

export function WalletProvider({ children }: WalletProviderProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [activeVault, setActiveVault] = useState<VaultInfo | null>(null);
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [endpoint, setEndpointState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || DEFAULT_ENDPOINT;
  });

  // Update client endpoint when it changes
  useEffect(() => {
    walletClient.setEndpoint(endpoint);
    localStorage.setItem(STORAGE_KEY, endpoint);
  }, [endpoint]);

  const setEndpoint = useCallback((newEndpoint: string) => {
    setEndpointState(newEndpoint);
    setConnected(false);
    setStatus(null);
    setActiveVault(null);
    setKeys([]);
  }, []);

  const connect = useCallback(async (customEndpoint?: string) => {
    if (customEndpoint) {
      setEndpoint(customEndpoint);
    }

    setConnecting(true);
    setError(null);

    try {
      const isConnected = await walletClient.isConnected();
      if (!isConnected) {
        throw new Error('Cannot connect to wallet daemon');
      }

      const walletStatus = await walletClient.getStatus();
      setStatus(walletStatus);

      // Auto-select first unlocked vault, or first vault
      if (walletStatus.vaults.length > 0) {
        const unlockedVault = walletStatus.vaults.find(v => v.unlocked);
        const vault = unlockedVault || walletStatus.vaults[0];
        setActiveVault(vault);

        if (vault.unlocked) {
          const vaultKeys = await walletClient.listKeys(vault.name);
          setKeys(vaultKeys);
        }
      }

      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, [setEndpoint]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setStatus(null);
    setActiveVault(null);
    setKeys([]);
    setError(null);
  }, []);

  const refreshKeys = useCallback(async () => {
    if (!activeVault?.unlocked) {
      setKeys([]);
      return;
    }

    try {
      const vaultKeys = await walletClient.listKeys(activeVault.name);
      setKeys(vaultKeys);
    } catch (err) {
      console.error('Failed to refresh keys:', err);
    }
  }, [activeVault]);

  const selectVault = useCallback(async (vaultName: string) => {
    if (!status) return;

    const vault = status.vaults.find(v => v.name === vaultName);
    if (!vault) return;

    setActiveVault(vault);

    if (vault.unlocked) {
      try {
        const vaultKeys = await walletClient.listKeys(vault.name);
        setKeys(vaultKeys);
      } catch (err) {
        console.error('Failed to load keys:', err);
        setKeys([]);
      }
    } else {
      setKeys([]);
    }
  }, [status]);

  const unlockVault = useCallback(async (passphrase: string) => {
    if (!activeVault) {
      throw new Error('No vault selected');
    }

    await walletClient.unlockVault(activeVault.name, passphrase);

    // Refresh status and keys
    const newStatus = await walletClient.getStatus();
    setStatus(newStatus);

    const updatedVault = newStatus.vaults.find(v => v.name === activeVault.name);
    if (updatedVault) {
      setActiveVault(updatedVault);
      if (updatedVault.unlocked) {
        const vaultKeys = await walletClient.listKeys(updatedVault.name);
        setKeys(vaultKeys);
      }
    }
  }, [activeVault]);

  const canSign = useCallback((publicKeyHash: string) => {
    const normalizedHash = publicKeyHash.toLowerCase().replace(/^0x/, '');
    return keys.some(k => k.publicKeyHash.toLowerCase() === normalizedHash);
  }, [keys]);

  const getSigningKey = useCallback((publicKeyHash: string): KeyInfo | undefined => {
    const normalizedHash = publicKeyHash.toLowerCase().replace(/^0x/, '');
    return keys.find(k => k.publicKeyHash.toLowerCase() === normalizedHash);
  }, [keys]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
  }, []);

  const value: WalletContextValue = {
    connected,
    connecting,
    error,
    status,
    activeVault,
    keys,
    connect,
    disconnect,
    refreshKeys,
    selectVault,
    unlockVault,
    canSign,
    getSigningKey,
    endpoint,
    setEndpoint,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
