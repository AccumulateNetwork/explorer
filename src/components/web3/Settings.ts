import { store } from '../explorer/Settings';

type ConnectedType = 'Web3' | null;

export const Settings = new (class Settings {
  @store(localStorage, 'web3')
  accessor dashboardOpen = false;

  @store(localStorage, 'web3')
  accessor backup: Record<string, any> = {};

  @store(localStorage, 'web3')
  accessor connected: ConnectedType = null;

  @store(localStorage, 'web3')
  accessor #publicKeys: Record<string, string> = {};

  getKey(account: string): Uint8Array {
    return Buffer.from(this.#publicKeys[account], 'hex');
  }

  putKey(account: string, publicKey: Uint8Array) {
    const keys = this.#publicKeys;
    keys[account] = Buffer.from(publicKey).toString('hex');
    this.#publicKeys = keys;
  }
})();
