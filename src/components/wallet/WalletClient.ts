/**
 * WalletClient — typed client for the local Accumulate wallet API served by
 * `ccli webui` at the same origin as this app (see walletMode.ts).
 *
 * Auth: the daemon mints a per-run session token, fetched from GET /v1/session
 * (same-origin only) and sent as `Authorization: Bearer`. There is no CORS, so
 * this only works when the app is served by the daemon or proxied to it.
 */
import { fetchWalletSessionToken, walletApiBase } from '../../walletMode';

export interface VaultInfo {
  name: string;
  unlocked: boolean;
  keyCount: number;
}

export interface WalletStatus {
  vaults: VaultInfo[];
}

export interface KeyInfo {
  label: string;
  liteAddress: string;
  type: string;
  publicKey: string; // base64
  balance?: string;
}

export interface AccountInfo {
  url: string;
  type: string;
  balance?: string;
}

export interface PendingTransaction {
  txid: string;
  type?: string;
  account?: string;
}

export interface SignResult {
  signature: string; // base64
  publicKey: string; // base64
}

export interface ExecResult {
  success: boolean;
  output?: string;
  [key: string]: unknown;
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

/** Thrown when the daemon rejects auth even after refreshing the token. */
export class WalletAuthError extends Error {}

export class WalletClient {
  private endpoint: string;
  private requestId = 0;
  private token: string | null = null;

  constructor(endpoint: string = walletApiBase()) {
    this.endpoint = endpoint;
  }

  /** True if the daemon is reachable and a session token is obtainable. */
  async isConnected(): Promise<boolean> {
    const token = await this.ensureToken();
    if (!token) return false;
    try {
      await this.status();
      return true;
    } catch {
      return false;
    }
  }

  status(walletPath?: string): Promise<WalletStatus> {
    return this.call('wallet.Status', { wallet: walletPath });
  }

  async listVaults(walletPath?: string): Promise<string[]> {
    const r = await this.call<{ vaults: string[] }>('wallet.ListVaults', {
      wallet: walletPath,
    });
    return r.vaults ?? [];
  }

  unlockVault(
    vault: string,
    passphrase: string,
    walletPath?: string,
  ): Promise<{ success: boolean }> {
    return this.call('wallet.UnlockVault', {
      vault,
      passphrase,
      wallet: walletPath,
    });
  }

  async listKeys(vault?: string, walletPath?: string): Promise<KeyInfo[]> {
    const r = await this.call<{ keys: KeyInfo[] }>('wallet.ListKeys', {
      vault,
      wallet: walletPath,
    });
    return r.keys ?? [];
  }

  async listAccounts(
    vault?: string,
    walletPath?: string,
  ): Promise<AccountInfo[]> {
    const r = await this.call<{ accounts: AccountInfo[] }>(
      'wallet.ListAccounts',
      { vault, wallet: walletPath },
    );
    return r.accounts ?? [];
  }

  async getAccountCache(
    vault?: string,
    walletPath?: string,
  ): Promise<AccountInfo[]> {
    const r = await this.call<{ accounts: AccountInfo[] }>(
      'wallet.GetAccountCache',
      { vault, wallet: walletPath },
    );
    return r.accounts ?? [];
  }

  async listPending(account: string): Promise<PendingTransaction[]> {
    const r = await this.call<{ pending: PendingTransaction[] }>(
      'wallet.ListPending',
      { account },
    );
    return r.pending ?? [];
  }

  sign(req: {
    keyLabel: string;
    transaction: string; // base64-encoded transaction hash
    signer: string;
    signerVersion: number;
    vault?: string;
  }): Promise<SignResult> {
    return this.call('wallet.Sign', req);
  }

  sendTokens(from: string, to: string, amount: string): Promise<ExecResult> {
    return this.call('wallet.SendTokens', { from, to, amount });
  }

  addCredits(from: string, to: string, amount: number): Promise<ExecResult> {
    return this.call('wallet.AddCredits', { from, to, amount });
  }

  faucet(to: string): Promise<ExecResult> {
    return this.call('wallet.Faucet', { to });
  }

  createADI(
    sponsor: string,
    name: string,
    keyLabel: string,
  ): Promise<ExecResult> {
    return this.call('wallet.CreateADI', { sponsor, name, keyLabel });
  }

  /** Fetch and cache the session token; returns null if unreachable. */
  private async ensureToken(): Promise<string | null> {
    if (this.token) return this.token;
    this.token = await fetchWalletSessionToken();
    return this.token;
  }

  private async call<T>(method: string, params: unknown): Promise<T> {
    let token = await this.ensureToken();
    if (!token) {
      throw new WalletAuthError('wallet daemon is not reachable');
    }

    // Retry once on 401 with a freshly minted token (daemon may have restarted).
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++this.requestId,
          method,
          params: params ?? {},
        }),
      });

      if (response.status === 401 && attempt === 0) {
        this.token = null;
        token = await this.ensureToken();
        if (!token)
          throw new WalletAuthError('wallet session token unavailable');
        continue;
      }
      if (response.status === 401) {
        throw new WalletAuthError('wallet daemon rejected the session token');
      }
      if (!response.ok) {
        throw new Error(`wallet API HTTP ${response.status}`);
      }

      const json: JsonRpcResponse<T> = await response.json();
      if (json.error) {
        throw new Error(json.error.message || 'wallet API error');
      }
      return json.result as T;
    }
    // Unreachable: the loop either returns or throws.
    throw new WalletAuthError('wallet authentication failed');
  }
}

/** Shared client bound to the same-origin API. */
export const walletClient = new WalletClient();
