/**
 * WalletClient - TypeScript client for the Accumulate Wallet Daemon JSON-RPC API
 *
 * This client communicates with the wallet daemon to:
 * - List vaults and keys
 * - Sign transactions
 * - Manage accounts
 */

export interface WalletStatus {
  vaults: VaultInfo[];
}

export interface VaultInfo {
  name: string;
  unlocked: boolean;
  keyCount: number;
}

export interface KeyInfo {
  label: string;
  type: string;
  publicKey: string;
  publicKeyHash: string;
  liteAccount: string;
}

export interface CachedAccount {
  url: string;
  type: string;
  balance?: string;
  tokenUrl?: string;
}

export interface SignRequest {
  transaction: any;
  signer: string;
  signerVersion: number;
  timestamp: number;
}

export interface SignResponse {
  signature: Uint8Array;
  publicKey: Uint8Array;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any;
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class WalletClient {
  private endpoint: string;
  private requestId: number = 0;
  private authToken: Uint8Array | null = null;

  constructor(endpoint: string = 'http://127.0.0.1:8079/v1') {
    this.endpoint = endpoint;
  }

  /**
   * Set the wallet daemon endpoint
   */
  setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
    this.authToken = null; // Reset auth when endpoint changes
  }

  /**
   * Get the current endpoint
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Check if the wallet daemon is reachable
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.getStatus();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet status including vault info
   */
  async getStatus(walletPath?: string): Promise<WalletStatus> {
    // Include token if we have one, so the daemon knows our unlock state
    const token = this.authToken ? Buffer.from(this.authToken).toString('base64') : null;
    const result = await this.call<any>('wallet.Status', {
      wallet: walletPath,
      token,
    });

    return {
      vaults: (result.vaults || []).map((v: any) => ({
        name: v.name || '',
        unlocked: v.unlocked || false,
        keyCount: v.keyCount || 0,
      })),
    };
  }

  /**
   * Get auth token for authenticated operations
   */
  async getAuthToken(): Promise<Uint8Array> {
    if (this.authToken) {
      return this.authToken;
    }

    const result = await this.call<any>('wallet.RefreshToken', {
      token: null,
    });

    if (result.token) {
      this.authToken = new Uint8Array(
        Buffer.from(result.token, 'base64')
      );
    }

    return this.authToken!;
  }

  /**
   * List vaults in the wallet
   */
  async listVaults(walletPath?: string): Promise<string[]> {
    const result = await this.call<any>('wallet.ListVaults', {
      wallet: walletPath,
    });
    return result.vaults || [];
  }

  /**
   * Unlock a vault with password
   */
  async unlockVault(
    vaultName: string,
    passphrase: string,
    walletPath?: string
  ): Promise<void> {
    console.log('WalletClient.unlockVault called:', { vaultName, hasPassphrase: !!passphrase });
    try {
      const token = await this.getAuthToken();
      console.log('Got auth token, calling unlock...');
      await this.call('wallet.UnlockVault', {
        wallet: walletPath,
        vault: vaultName,
        passphrase,
        token: Buffer.from(token).toString('base64'),
        ttl: 3600000000000, // 1 hour in nanoseconds
      });
      console.log('Unlock call completed successfully');
    } catch (err) {
      console.error('Unlock failed with error:', err);
      throw err; // Re-throw to propagate to caller
    }
  }

  /**
   * List keys in a vault
   */
  async listKeys(vaultName?: string, walletPath?: string): Promise<KeyInfo[]> {
    const token = await this.getAuthToken();
    const result = await this.call<any>('wallet.ListKeys', {
      wallet: walletPath,
      vault: vaultName,
      token: Buffer.from(token).toString('base64'),
    });

    return (result.keys || []).map((k: any) => ({
      label: k.labels?.names?.[0] || k.labels?.lite || 'Unnamed',
      type: k.type || 'unknown',
      publicKey: k.publicKey ? Buffer.from(k.publicKey, 'base64').toString('hex') : '',
      publicKeyHash: k.publicKeyHash ? Buffer.from(k.publicKeyHash, 'base64').toString('hex') : '',
      liteAccount: k.labels?.lite || '',
    }));
  }

  /**
   * Get cached accounts
   */
  async getCachedAccounts(vaultName?: string, walletPath?: string): Promise<CachedAccount[]> {
    const token = await this.getAuthToken();
    const result = await this.call<any>('wallet.GetAccountCache', {
      wallet: walletPath,
      vault: vaultName,
      token: Buffer.from(token).toString('base64'),
    });

    return (result.accounts || []).map((a: any) => ({
      url: a.url || '',
      type: a.type || '',
      balance: a.balance,
      tokenUrl: a.tokenUrl,
    }));
  }

  /**
   * Sign a transaction using a wallet key
   */
  async sign(
    keyLabel: string,
    transaction: any,
    signer: string,
    signerVersion: number,
    vaultName?: string,
    walletPath?: string
  ): Promise<SignResponse> {
    const token = await this.getAuthToken();
    const result = await this.call<any>('wallet.Sign', {
      wallet: walletPath,
      vault: vaultName,
      token: Buffer.from(token).toString('base64'),
      key: keyLabel,
      transaction,
      signer,
      signerVersion,
      timestamp: Date.now() * 1000000, // Nanoseconds
    });

    return {
      signature: new Uint8Array(Buffer.from(result.signature, 'base64')),
      publicKey: new Uint8Array(Buffer.from(result.publicKey, 'base64')),
    };
  }

  /**
   * Find keys that can sign for a given account
   */
  async findSignersFor(
    accountUrl: string,
    vaultName?: string,
    walletPath?: string
  ): Promise<KeyInfo[]> {
    // This would ideally be a daemon method, but for now we can
    // cross-reference the account's key page with our wallet keys
    const keys = await this.listKeys(vaultName, walletPath);
    // For now, return all keys - the UI can filter based on account authorities
    return keys;
  }

  /**
   * Execute a CLI command via the daemon
   */
  async executeCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const result = await this.call<any>('wallet.Execute', {
      command: command.split(' '),
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode || 0,
    };
  }

  /**
   * Make a JSON-RPC call to the wallet daemon
   */
  private async call<T>(method: string, params: any): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params,
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const json: JsonRpcResponse<T> = await response.json();
    console.log('Wallet API raw response:', method, JSON.stringify(json));

    if (json.error) {
      console.error('Wallet API error detected:', json.error);
      const errorMessage = json.error.message || 'Unknown error';
      console.error('Throwing error:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('Wallet API success:', method);
    return json.result as T;
  }
}

// Singleton instance
export const walletClient = new WalletClient();
