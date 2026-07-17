/**
 * WalletContext — React state for the local wallet integration.
 *
 * The client talks to the same-origin `/v1` API (see walletMode.ts), so there
 * is no endpoint to configure and no cross-origin probe. Auto-connect only
 * runs in the local-wallet build; the production build never touches the API.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { isLocalWallet } from '../../walletMode';
import {
  AccountInfo,
  KeyInfo,
  VaultInfo,
  WalletStatus,
  walletClient,
} from './WalletClient';

export interface WalletContextValue {
  connected: boolean;
  connecting: boolean;
  error: string | null;

  status: WalletStatus | null;
  activeVault: VaultInfo | null;
  keys: KeyInfo[];
  accounts: AccountInfo[];

  connect: () => Promise<void>;
  disconnect: () => void;
  selectVault: (vaultName: string) => Promise<void>;
  unlockVault: (passphrase: string) => Promise<void>;
  refresh: () => Promise<void>;

  /** The wallet key whose lite address matches, if any. */
  keyForLiteAddress: (url: string) => KeyInfo | undefined;
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

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [activeVault, setActiveVault] = useState<VaultInfo | null>(null);
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);

  const loadVault = useCallback(async (vault: VaultInfo) => {
    setActiveVault(vault);
    if (!vault.unlocked) {
      setKeys([]);
      setAccounts([]);
      return;
    }
    const [vaultKeys, vaultAccounts] = await Promise.all([
      walletClient.listKeys(vault.name),
      walletClient.listAccounts(vault.name).catch(() => []),
    ]);
    setKeys(vaultKeys);
    setAccounts(vaultAccounts);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      if (!(await walletClient.isConnected())) {
        throw new Error('Wallet daemon is not reachable');
      }
      const walletStatus = await walletClient.status();
      setStatus(walletStatus);

      const vault =
        walletStatus.vaults.find((v) => v.unlocked) ?? walletStatus.vaults[0];
      if (vault) {
        await loadVault(vault);
      }
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, [loadVault]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setStatus(null);
    setActiveVault(null);
    setKeys([]);
    setAccounts([]);
    setError(null);
  }, []);

  const selectVault = useCallback(
    async (vaultName: string) => {
      const vault = status?.vaults.find((v) => v.name === vaultName);
      if (vault) await loadVault(vault);
    },
    [status, loadVault],
  );

  const refresh = useCallback(async () => {
    const walletStatus = await walletClient.status();
    setStatus(walletStatus);
    const vault = activeVault
      ? walletStatus.vaults.find((v) => v.name === activeVault.name)
      : undefined;
    if (vault) await loadVault(vault);
  }, [activeVault, loadVault]);

  const unlockVault = useCallback(
    async (passphrase: string) => {
      if (!activeVault) throw new Error('No vault selected');
      await walletClient.unlockVault(activeVault.name, passphrase);
      await refresh();
    },
    [activeVault, refresh],
  );

  const keyForLiteAddress = useCallback(
    (url: string) => keys.find((k) => k.liteAddress === url),
    [keys],
  );

  // Auto-connect only in the local-wallet build. The production build must
  // never touch the API (there is no daemon and no endpoint to probe).
  useEffect(() => {
    if (isLocalWallet) {
      void connect();
    }
  }, [connect]);

  const value: WalletContextValue = {
    connected,
    connecting,
    error,
    status,
    activeVault,
    keys,
    accounts,
    connect,
    disconnect,
    selectVault,
    unlockVault,
    refresh,
    keyForLiteAddress,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
