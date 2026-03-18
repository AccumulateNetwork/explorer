/**
 * Wallet module - Integration with Accumulate Wallet Daemon
 *
 * This module provides:
 * - WalletClient: JSON-RPC client for wallet daemon communication
 * - WalletContext: React context for wallet state
 * - WalletPanel: UI component for wallet interaction
 * - CurrentAccountContext: Shares currently viewed account across components
 */

export { WalletClient, walletClient } from './WalletClient';
export type { WalletStatus, VaultInfo, KeyInfo, CachedAccount, SignRequest, SignResponse } from './WalletClient';

export { WalletProvider, useWallet, useWalletRequired } from './Context';
export type { WalletContextValue } from './Context';

export { WalletPanel, WalletToggleButton } from './WalletPanel';

export { CurrentAccountProvider, useCurrentAccount } from './CurrentAccountContext';
export type { CurrentAccount, CurrentTransaction, CurrentAccountContextValue } from './CurrentAccountContext';
