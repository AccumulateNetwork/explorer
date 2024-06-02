import { broadcast, prefix, storage, stored } from '../common/Shared';

type ConnectedType = 'Web3' | null;

export const Settings = new (
  @storage(localStorage)
  @prefix('web3')
  class Settings {
    @broadcast @stored accessor dashboardOpen = false;
    @broadcast @stored accessor connected: ConnectedType = null;

    @stored accessor backup: Record<string, any> = {};
    @stored accessor #publicKeys: Record<string, string> = {};

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
