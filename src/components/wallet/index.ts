/**
 * Wallet module — integration with the local Accumulate wallet API
 * (`ccli webui`, same origin, see walletMode.ts).
 *
 * - WalletClient: typed JSON-RPC client with session-token auth
 * - WalletContext: React state for the wallet
 * - WalletPanel: drawer UI
 * - CurrentAccountContext: shares the currently viewed account/tx
 */

export { WalletClient, WalletAuthError, walletClient } from './WalletClient';
export type {
  WalletStatus,
  VaultInfo,
  KeyInfo,
  AccountInfo,
  PendingTransaction,
  SignResult,
  ExecResult,
} from './WalletClient';

export { WalletProvider, useWallet, useWalletRequired } from './Context';
export type { WalletContextValue } from './Context';

export { WalletPanel, WalletToggleButton } from './WalletPanel';

export {
  CurrentAccountProvider,
  useCurrentAccount,
} from './CurrentAccountContext';
export type {
  CurrentAccount,
  CurrentTransaction,
  CurrentAccountContextValue,
} from './CurrentAccountContext';
