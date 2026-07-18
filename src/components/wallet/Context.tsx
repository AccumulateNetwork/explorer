/**
 * WalletContext — React state for the local wallet integration.
 *
 * Network selection is lazy: the wallet is bound to the network the explorer
 * has selected, but nothing is probed or connected until the user asks the
 * wallet to do something. Because every wallet action (including unlocking)
 * names the network, the user always knows which network they are acting on.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

import { Network } from '../common/Network';
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

  /** The network wallet operations act on (the explorer's selected network). */
  networkLabel: string;
  networkId: string;

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
  const { network } = useContext(Network);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [activeVault, setActiveVault] = useState<VaultInfo | null>(null);
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);

  // Bind the client to the selected network so every request targets that
  // network's wallet. Set synchronously (not in an effect) so it is in place
  // before any user-triggered call fires. Network switches reload the page,
  // so re-reading here on each render keeps this current.
  walletClient.setNetwork(network.api[0]);

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

  // No auto-connect: network selection is lazy. The wallet only touches the
  // daemon when the user asks it to (opening the panel and connecting, or an
  // action), at which point it acts on the currently selected network.

  const value: WalletContextValue = {
    connected,
    connecting,
    error,
    networkLabel: network.label,
    networkId: network.id,
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
