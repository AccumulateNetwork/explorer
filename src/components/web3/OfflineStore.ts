import { broadcast, prefix, storage, stored } from '../common/Shared';
import { Store } from './Store';

@prefix('web3:store')
@storage(localStorage)
export class OfflineStore implements Store {
  @broadcast @stored static accessor #entries: Record<string, Store.Entry[]> =
    {};

  readonly #account: string;

  constructor(publicKey: Uint8Array) {
    this.#account = Buffer.from(publicKey).toString('hex');
  }

  *[Symbol.iterator](): Generator<Store.Entry, void, undefined> {
    yield* OfflineStore.#entries[this.#account] || [];
  }

  add(entry: Store.Entry) {
    const e = OfflineStore.#entries[this.#account] || [];
    OfflineStore.#entries = {
      ...OfflineStore.#entries,
      [this.#account]: [...e, entry],
    };
    return Promise.resolve(true);
  }
}
