import { URL } from 'accumulate.js';
import { JsonRpcClient } from 'accumulate.js/lib/api_v3';
import { Buffer } from 'accumulate.js/lib/common';
import { LiteIdentity } from 'accumulate.js/lib/core';

import { broadcast, prefix, storage, stored } from '../common/Shared';
import { fetchAccount } from '../common/query';
import { Linked } from './Linked';
import { OfflineStore } from './OfflineStore';
import { OnlineStore } from './OnlineStore';
import { Store } from './Store';
import { EthPublicKey, Wallet } from './Wallet';

@prefix('web3:account')
@storage(localStorage)
export class Account {
  static readonly #for = new Map<string, Account>();

  @broadcast @stored static accessor #keys: Record<string, string> = {};

  static get supported() {
    return Wallet.canEncrypt;
  }

  static for(publicKey: Uint8Array) {
    const key = Buffer.from(publicKey).toString('hex');
    if (this.#for.has(key)) {
      return this.#for.get(key);
    }

    const inst = new this(publicKey);
    Account.#for.set(key, inst);
    return inst;
  }

  readonly publicKey: EthPublicKey;
  readonly liteIdUrl: URL;
  readonly online: OnlineStore;
  readonly offline: OfflineStore;
  liteIdentity?: LiteIdentity;
  entries?: Store.Entry[];
  @broadcast.as(Linked) accessor linked: Linked | null;

  // TODO: this should be private, but that screws up the decorators
  constructor(publicKey: Uint8Array) {
    const ethPub = new EthPublicKey(publicKey);
    this.publicKey = ethPub;
    this.liteIdUrl = ethPub.lite;
    this.online = new OnlineStore(ethPub);
    this.offline = new OfflineStore(publicKey);
  }

  get store(): Store {
    return this.online.canEncrypt ? this.online : this.offline;
  }

  async load(api: JsonRpcClient) {
    if (!this.liteIdentity) {
      this.liteIdentity = await fetchAccount(api, this.liteIdUrl, LiteIdentity);
    }

    await this.online.load(api);
    this.entries = [...this.store];

    if (!this.linked) {
      const x = await Linked.load(api, [
        {
          type: 'link',
          accountType: 'identity',
          url: `${this.liteIdUrl}`,
        },
        ...this.entries,
      ]);
      this.linked = x;
    }
  }

  async reload(
    api: JsonRpcClient,
    ...fields: ('liteIdentity' | 'entries' | 'linked')[]
  ) {
    for (const f of fields) {
      this[f] = null;
      if (f === 'entries') {
        this.online.resetEntries();
      }
    }
    await this.load(api);
  }
}
