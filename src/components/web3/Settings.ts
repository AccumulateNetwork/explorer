import { broadcast, store } from '../explorer/Settings';

type ConnectedType = 'Web3' | null;

export const Settings = new (
  @store(localStorage, 'web3')
  class Settings {
    @store @broadcast('web3') accessor dashboardOpen = false;
    @store @broadcast('web3') accessor connected: ConnectedType = null;

    @store accessor backup: Record<string, any> = {};
    @store accessor #publicKeys: Record<string, string> = {};

    getKey(account: string): Uint8Array {
      return Buffer.from(this.#publicKeys[account], 'hex');
    }

    putKey(account: string, publicKey: Uint8Array) {
      const keys = this.#publicKeys;
      keys[account] = Buffer.from(publicKey).toString('hex');
      this.#publicKeys = keys;
    }
  }
)();
