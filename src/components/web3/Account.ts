import { URL } from 'accumulate.js';
import { JsonRpcClient } from 'accumulate.js/lib/api_v3';
import { Buffer } from 'accumulate.js/lib/common';
import { KeyBook, KeyPage, LiteIdentity } from 'accumulate.js/lib/core';

import { isRecordOf } from '../../utils/types';
import { broadcast, prefix, storage, stored } from '../common/Shared';
import { fetchAccount } from '../common/query';
import { OfflineStore } from './OfflineStore';
import { OnlineStore } from './OnlineStore';
import { RegisterBook, Store } from './Store';
import { Wallet } from './Wallet';
import { ethAddress, liteIDForEth } from './utils';

@prefix('web3:account')
@storage(localStorage)
export class Account {
  static readonly #for = new Map<string, Account>();

  @broadcast @stored static accessor #keys: Record<string, string> = {};

  static get supported() {
    return Wallet.canEncrypt;
  }

  static async for(publicKey: Uint8Array) {
    const key = Buffer.from(publicKey).toString('hex');
    if (this.#for.has(key)) {
      return this.#for.get(key);
    }

    const lite = URL.parse(await liteIDForEth(publicKey));
    const offline = await OnlineStore.for(publicKey);
    const inst = new this(publicKey, lite, offline);
    Account.#for.set(key, inst);
    return inst;
  }

  readonly publicKey: Uint8Array;
  readonly liteIdUrl: URL;
  readonly online: OnlineStore;
  readonly offline: OfflineStore;
  liteIdentity?: LiteIdentity;
  entries?: Store.Entry[];
  registeredBooks?: { book: KeyBook; pages: KeyPage[] }[];

  // TODO: this should be private, but that screws up the decorators
  constructor(publicKey: Uint8Array, liteIdUrl: URL, online: OnlineStore) {
    this.publicKey = publicKey;
    this.liteIdUrl = liteIdUrl;
    this.online = online;
    this.offline = new OfflineStore(publicKey);
  }

  get ethereum() {
    return ethAddress(this.publicKey);
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

    await this.#loadRegistered(api);
  }

  async reloadLiteIdentity(api: JsonRpcClient) {
    this.liteIdentity = await fetchAccount(api, this.liteIdUrl, LiteIdentity);
  }

  async #loadRegistered(api: JsonRpcClient) {
    if (!this.entries || this.registeredBooks) {
      return;
    }

    const tryParse = (s: string) => {
      try {
        return URL.parse(s);
      } catch (_) {}
    };
    this.registeredBooks = await Promise.all(
      Object.values(this.entries)
        .filter((x): x is RegisterBook => x.type === 'registerBook')
        .map((x) => tryParse(x.url))
        .filter((x) => x)
        .map(async (x) => {
          const r = await api.query(x);
          if (!isRecordOf(r, KeyBook)) {
            return;
          }

          const pages = await Promise.all(
            [...Array(r.account.pageCount).keys()].map(async (_, i) => {
              const r = await api.query(`${x}/${i + 1}`);
              if (!isRecordOf(r, KeyPage)) {
                return;
              }
              return r.account;
            }),
          );

          return {
            book: r.account,
            pages: pages.filter((x) => x),
          };
        })
        .filter((x) => x),
    );
  }
}
