import { Context } from 'react';
import nacl from 'tweetnacl';

import { URL } from 'accumulate.js';
import { JsonRpcClient } from 'accumulate.js/lib/api_v3';
import { Buffer, sha256 } from 'accumulate.js/lib/common';
import {
  DataEntry,
  DataEntryType,
  DoubleHashDataEntry,
  LiteDataAccount,
  TransactionArgs,
} from 'accumulate.js/lib/core';

import { broadcast, prefix, storage, stored } from '../common/Shared';
import { fetchAccount, fetchDataEntries } from '../common/query';
import { Driver, EthPublicKey } from './Driver';
import { Store } from './Store';

export class OnlineStore {
  readonly #driver: Driver;
  readonly #token: Token;
  readonly url: URL;
  #account?: LiteDataAccount;
  #key?: Uint8Array;
  #raw?: DataEntry[];
  #entries?: Entry[];

  constructor(driver: Driver, publicKey: EthPublicKey) {
    this.#driver = driver;
    this.#token = new Token(publicKey);
    const hash = sha256(sha256(this.#token.for('backup')));
    this.url = URL.parse(`acc://${Buffer.from(hash).toString('hex')}`);
  }

  resetEntries() {
    this.#raw = null;
    this.#entries = null;
  }

  get account() {
    return this.#account;
  }

  get enabled() {
    return !!this.#key;
  }

  *[Symbol.iterator](): Generator<Store.Entry, void, undefined> {
    if (!this.#entries) {
      return;
    }
    for (const { plain } of this.#entries) {
      yield plain;
    }
  }

  get(hash: string | Uint8Array): Store.Entry | undefined {
    if (hash instanceof Uint8Array) {
      hash = Buffer.from(hash).toString('hex');
    }
    return this.#entries?.find((e) => e.hash === hash)?.plain;
  }

  async add(sign: Store.Sign, plain: Store.Entry) {
    if (!this.#entries) {
      throw new Error('Online backups are not enabled');
    }
    const entry = await Entry.encrypt(this.#token, this.#key, plain);
    const txn: TransactionArgs = {
      header: { principal: this.url },
      body: { type: 'writeData', entry: entry.crypt },
    };
    if (!(await sign(txn))) {
      return false;
    }
    this.#entries.push(entry);
    return true;
  }

  async load(api: JsonRpcClient) {
    // Load the account
    if (!this.#account) {
      this.#account = await fetchAccount(api, this.url, LiteDataAccount);
    }

    // Fetch all the data entries
    const isEntry = await this.#token.match('entry', 0);
    const isKey = await this.#token.match('key', 0);
    const isEth = await this.#token.match('eth_decrypt', 1);
    if (this.#account && !this.#raw) {
      this.#raw = await fetchDataEntries(
        api,
        this.url,
        (e) => isEntry(e) || (isKey(e) && isEth(e)),
      );
    }

    // Find and decrypt the key:eth_decrypt entry
    if (this.#raw && !this.#key) {
      const keyCrypt = this.#raw.find((e) => isKey(e) && isEth(e));
      if (keyCrypt) {
        this.#key = await Key.decrypt(this.#driver, this.#token, keyCrypt);
      }
    }

    // Decrypt entries
    const keyHash = Buffer.from(sha256(this.#key)).toString('hex');
    const isMyKey = await this.#token.match(keyHash, 1);
    if (this.#raw && this.#key && !this.#entries) {
      this.#entries = await Promise.all(
        this.#raw
          .filter((e) => isEntry(e) && isMyKey(e))
          .map((crypt) => Entry.decrypt(this.#token, this.#key, crypt)),
      );
    }
  }

  async setup(api: JsonRpcClient, sign: Store.Sign) {
    await this.load(api);

    // Create the LDA
    if (!this.#account) {
      const data = [new Uint8Array(), this.#token.for('backup')];
      const txn: TransactionArgs = {
        header: { principal: this.url },
        body: { type: 'writeData', entry: { type: 'doubleHash', data } },
      };
      if (!(await sign(txn))) {
        return false;
      }

      await this.load(api);
    }

    // Generate and record a key
    if (!this.#key) {
      const { key, data } = await Key.generate(this.#driver, this.#token);
      const txn: TransactionArgs = {
        header: { principal: this.url },
        body: { type: 'writeData', entry: { type: 'doubleHash', data } },
      };
      if (!(await sign(txn))) {
        return false;
      }

      this.#key = key;
      await this.load(api);
    }

    return true;
  }
}

class Entry {
  readonly hash: string;
  readonly crypt: DataEntry;
  readonly plain: Store.Entry;

  private constructor(hash: string, crypt: DataEntry, plain: Store.Entry) {
    this.hash = hash;
    this.crypt = crypt;
    this.plain = plain;
  }

  static encrypt(token: Token, key: Uint8Array, plain: Store.Entry) {
    const keyHash = sha256(key);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const message = Buffer.from(JSON.stringify(plain), 'utf-8');
    const box = nacl.secretbox(message, nonce, key);

    const crypt = new DoubleHashDataEntry({
      data: [
        token.for('entry'),
        token.for(keyHash),
        Buffer.concat([nonce, box]),
      ],
    });

    const hash = Buffer.from(crypt.hash()).toString('hex');
    return new this(hash, crypt, plain);
  }

  static decrypt(token: Token, key: Uint8Array, crypt: DataEntry) {
    const keyHash = Buffer.from(sha256(key)).toString('hex');
    const isEntry = token.match('entry', 0);
    const isKey = token.match(keyHash, 1);

    const parts = this.parts(crypt);
    if (parts.length != 3 || !isEntry(parts) || !isKey(parts)) {
      throw new Error('Not a valid encrypted entry for this key');
    }

    const nonce = parts[2].slice(0, nacl.secretbox.nonceLength);
    const message = parts[2].slice(nacl.secretbox.nonceLength);
    const raw = nacl.secretbox.open(message, nonce, key);
    if (!raw) {
      throw new Error('Not a valid encrypted entry for this key');
    }

    const hash = Buffer.from(crypt.hash()).toString('hex');
    const plain = JSON.parse(Buffer.from(raw).toString('utf-8'));
    return new this(hash, crypt, plain);
  }

  static parts(entry: DataEntry) {
    switch (entry.type) {
      case DataEntryType.Factom:
        return [entry.data, ...entry.extIds];
      default:
        return entry.data;
    }
  }

  static partAsHex(entry: DataEntry | Uint8Array[], i: number) {
    const part = entry instanceof Array ? entry[i] : this.parts(entry)[i];
    if (!part?.length) {
      return '';
    }
    return Buffer.from(part).toString('hex');
  }
}

class Token {
  static readonly #for: Record<string, Token> = {};
  readonly publicKey: EthPublicKey;
  readonly #cache: Record<string, Buffer> = {};

  constructor(publicKey: EthPublicKey) {
    if (publicKey.ethereum in Token.#for) {
      return Token.#for[publicKey.ethereum];
    }
    this.publicKey = publicKey;
    Token.#for[publicKey.ethereum] = this;
  }

  for(suffix: string | Uint8Array) {
    if (typeof suffix !== 'string') {
      suffix = Buffer.from(suffix).toString('hex');
    }
    if (suffix in this.#cache) {
      return this.#cache[suffix];
    }

    const addr = this.publicKey;
    const token = Buffer.from(
      sha256(Buffer.from(`${addr}:${suffix}`, 'utf-8')),
    );
    this.#cache[suffix] = token;
    return token;
  }

  match(suffix: string | Uint8Array, i: number) {
    const token = this.for(suffix).toString('hex');
    return (e: DataEntry | Uint8Array[]) => Entry.partAsHex(e, i) === token;
  }
}

@prefix('web3:account')
@storage(localStorage)
class Key {
  @broadcast @stored static accessor #keys: Record<string, string> = {};

  static async decrypt(driver: Driver, token: Token, crypt: DataEntry) {
    const hash = Buffer.from(crypt.hash()).toString('hex');
    if (hash in this.#keys) {
      return Buffer.from(this.#keys[hash], 'hex');
    }

    const data = Entry.parts(crypt).slice(2);
    const raw = await driver.decrypt(token.publicKey, {
      nonce: Buffer.from(data[0]).toString('base64'),
      ephemPublicKey: Buffer.from(data[1]).toString('base64'),
      ciphertext: Buffer.from(data[2]).toString('base64'),
    });

    const hex: string = JSON.parse(raw);
    const key = Buffer.from(hex, 'hex');
    this.#keys = {
      ...this.#keys,
      [hash]: Buffer.from(key).toString('hex'),
    };
    return key;
  }

  static async generate(driver: Driver, token: Token) {
    // Generate a new key using NaCl
    const key = nacl.randomBytes(nacl.secretbox.keyLength);

    // Encrypt it using Metamask
    const { nonce, ephemPublicKey, ciphertext } = await driver.encrypt(
      token.publicKey,
      JSON.stringify(Buffer.from(key).toString('hex')),
    );

    const data = [
      token.for('key'),
      token.for('eth_decrypt'),
      Buffer.from(nonce, 'base64'),
      Buffer.from(ephemPublicKey, 'base64'),
      Buffer.from(ciphertext, 'base64'),
    ];
    return { key, data };
  }
}
