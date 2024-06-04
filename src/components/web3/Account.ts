import { useWeb3React } from '@web3-react/core';
import { useContext, useState } from 'react';
import nacl from 'tweetnacl';

import { URL, URLArgs, core } from 'accumulate.js';
import {
  JsonRpcClient,
  RecordRange,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import { Buffer, sha256 } from 'accumulate.js/lib/common';
import {
  DataEntry,
  DataEntryType,
  DoubleHashDataEntry,
  KeyBook,
  KeyPage,
  LiteDataAccount,
  LiteIdentity,
  TransactionArgs,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import {
  Ctor,
  TxnEntry,
  isRecordOf,
  isRecordOfDataTxn,
} from '../../utils/types';
import { Shared } from '../common/Network';
import {
  broadcast,
  prefix,
  storage,
  stored,
  useShared,
} from '../common/Shared';
import { isErrorRecord } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { Settings } from './Settings';
import { EthPublicKey, Wallet } from './Wallet';
import { ethAddress, liteIDForEth } from './utils';

export type Entry = Note | RegisterBook;

interface Note {
  type: 'note';
  value: string;
}

interface RegisterBook {
  type: 'registerBook';
  url: string;
}

type SignAccumulate = (txn: TransactionArgs) => Promise<boolean>;

@prefix('web3:account')
@storage(localStorage)
export class Account {
  static readonly #for = new Map<string, Account>();

  @broadcast @stored static accessor #keys: Record<string, string> = {};

  static get supported() {
    return Wallet.canEncrypt;
  }

  static for(publicKey: Uint8Array) {
    return new this(publicKey);
  }

  readonly publicKey: Uint8Array;
  liteIdUrl: URL;
  backupUrl: URL;
  liteIdentity: LiteIdentity;
  backupAccount: LiteDataAccount;
  entries: { [hash: string]: Entry };
  registeredBooks: { book: KeyBook; pages: KeyPage[] }[];

  #rawEntries: DataEntry[];
  #encryptionKey: Uint8Array;

  // TODO: this should be private, but that screws up the decorators
  constructor(publicKey: Uint8Array) {
    const key = Buffer.from(publicKey).toString('hex');
    if (Account.#for.has(key)) {
      return Account.#for.get(key);
    }

    this.publicKey = publicKey;
    Account.#for.set(key, this);
  }

  get ethereum() {
    return ethAddress(this.publicKey);
  }

  get canEncrypt() {
    return !!this.#encryptionKey;
  }

  async load(api: JsonRpcClient) {
    await this.#loadAccount(api);
    await this.#loadEntries(api);
    await this.#locateKey();
    await this.#decryptEntries();
    await this.#loadRegistered(api);
  }

  async initialize(sign: SignAccumulate) {
    return await this.#submit(
      sign,
      new Uint8Array(),
      await this.#token('backup'),
    );
  }

  async generateKey(sign: SignAccumulate) {
    // Generate and encrypt a key
    const { key, data } = await generateKey({
      publicKey: this.publicKey,
      token: (s) => this.#token(s),
    });

    // Store it
    const ok = await this.#submit(sign, ...data);
    if (!ok) {
      return false;
    }

    this.#encryptionKey = key;
    return true;
  }

  async addEntry(sign: SignAccumulate, entry: Entry) {
    const data = await encryptEntry({
      plain: entry,
      key: this.#encryptionKey,
      token: (s) => this.#token(s),
    });
    const dataEntry = await this.#submit(sign, ...data);
    if (!dataEntry) {
      return false;
    }

    const entryHash = Buffer.from(await dataEntry.hash()).toString('hex');
    this.entries[entryHash] = entry;
    return true;
  }

  async reloadLiteIdentity(api: JsonRpcClient) {
    this.liteIdentity = await queryAccount(api, this.liteIdUrl, LiteIdentity);
  }

  async #loadAccount(api: JsonRpcClient) {
    if (this.backupAccount) {
      return;
    }

    this.liteIdUrl = URL.parse(await liteIDForEth(this.publicKey));

    const v = await sha256(await sha256(await this.#token('backup')));
    this.backupUrl = URL.parse(`acc://${Buffer.from(v).toString('hex')}`);

    // Does the LDA exist?
    const [lid, lda] = await Promise.all([
      queryAccount(api, this.liteIdUrl, LiteIdentity),
      queryAccount(api, this.backupUrl, LiteDataAccount),
    ]);
    this.liteIdentity = lid;
    this.backupAccount = lda;
  }

  async #loadEntries(api: JsonRpcClient) {
    if (this.#rawEntries || !this.backupAccount) {
      return;
    }

    const tokens = [
      // The token for entries
      (await this.#token('entry')).toString('hex'),
      // The token for the encryption key
      (await this.#token('key')).toString('hex'),
    ];

    this.#rawEntries = await filterDataEntries(api, this.backupUrl, (entry) =>
      tokens.includes(partAsHex(entry, 0)),
    );
  }

  async #locateKey() {
    if (this.#encryptionKey || !this.#rawEntries) {
      return;
    }

    // Find a entry that's been marked with key:eth_decrypt and attempt to
    // decrypt it.
    const keyToken = (await this.#token('key')).toString('hex');
    const ethToken = (await this.#token('eth_decrypt')).toString('hex');

    const { entry, parts } =
      this.#rawEntries
        .filter(withPrefix(keyToken, ethToken))
        .map((x) => ({ entry: x, parts: entryParts(x).slice(2) }))
        .find((x) => x.parts.length == 3) || {};
    if (!entry) {
      return;
    }

    const entryHash = Buffer.from(await entry.hash()).toString('hex');
    if (entryHash in Account.#keys) {
      this.#encryptionKey = Buffer.from(Account.#keys[entryHash], 'hex');
      return;
    }

    this.#encryptionKey = await decryptKey({
      data: parts,
      account: ethAddress(this.publicKey),
    });
    Account.#keys = {
      ...Account.#keys,
      [entryHash]: Buffer.from(this.#encryptionKey).toString('hex'),
    };
  }

  async #decryptEntries() {
    if (!this.#encryptionKey || !this.#rawEntries || this.entries) {
      return;
    }

    this.entries = await decryptEntries({
      key: this.#encryptionKey,
      crypt: this.#rawEntries,
      token: (s) => this.#token(s),
    });
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

  async #token(suffix: string) {
    const addr = new EthPublicKey(this.publicKey);
    return sha256(Buffer.from(`${await addr.format()}:${suffix}`, 'utf-8'));
  }

  async #submit(sign: SignAccumulate, ...data: Uint8Array[]) {
    const entry = new DoubleHashDataEntry({ data });
    const ok = await sign({
      header: { principal: this.backupUrl },
      body: { type: 'writeData', entry },
    });
    if (ok) {
      return entry;
    }
  }
}

async function generateKey({
  publicKey,
  token,
}: {
  publicKey: Uint8Array;
  token: (_: string) => Promise<Buffer>;
}) {
  // Generate a new key using NaCl
  const key = await nacl.randomBytes(nacl.secretbox.keyLength);

  // Encrypt it using Metamask
  const { nonce, ephemPublicKey, ciphertext } = await Wallet.encrypt(
    ethAddress(publicKey),
    JSON.stringify(Buffer.from(key).toString('hex')),
  );

  const data = [
    await token('key'),
    await token('eth_decrypt'),
    Buffer.from(nonce, 'base64'),
    Buffer.from(ephemPublicKey, 'base64'),
    Buffer.from(ciphertext, 'base64'),
  ];
  return { key, data };
}

async function decryptKey({
  data,
  account,
}: {
  data: Uint8Array[];
  account: string;
}) {
  const raw = await Wallet.decrypt(account, {
    nonce: Buffer.from(data[0]).toString('base64'),
    ephemPublicKey: Buffer.from(data[1]).toString('base64'),
    ciphertext: Buffer.from(data[2]).toString('base64'),
  });

  const hex = JSON.parse(raw);
  return Buffer.from(hex, 'hex');
}

async function encryptEntry({
  key,
  token,
  plain,
}: {
  key: Uint8Array;
  token: (_: string) => Promise<Buffer>;
  plain: Entry;
}) {
  const keyHash = await sha256(key);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const message = Buffer.from(JSON.stringify(plain), 'utf-8');
  const box = nacl.secretbox(message, nonce, key);

  return [
    await token('entry'),
    await token(keyHash.toString('hex')),
    Buffer.concat([nonce, box]),
  ];
}

async function decryptEntries({
  key,
  crypt,
  token,
}: {
  key: Uint8Array;
  crypt: DataEntry[];
  token: (_: string) => Promise<Buffer>;
}) {
  const keyHash = (await sha256(key)).toString('hex');
  const entryToken = (await token('entry')).toString('hex');
  const keyToken = (await token(keyHash)).toString('hex');

  const results = {};
  for (const dataEntry of crypt) {
    const parts = entryParts(dataEntry);
    if (parts.length != 3) {
      continue;
    }
    if (partAsHex(parts, 0) != entryToken) {
      continue;
    }
    if (partAsHex(parts, 1) != keyToken) {
      continue;
    }
    const nonce = parts[2].slice(0, nacl.secretbox.nonceLength);
    const message = parts[2].slice(nacl.secretbox.nonceLength);
    const plain = nacl.secretbox.open(message, nonce, key);
    if (!plain) {
      continue;
    }
    const hash = Buffer.from(await dataEntry.hash()).toString('hex');
    results[hash] = JSON.parse(Buffer.from(plain).toString('utf-8'));
  }
  return results;
}

async function filterDataEntries(
  api: JsonRpcClient,
  scope: URLArgs,
  predicate: (_: DataEntry) => boolean,
) {
  const results: DataEntry[] = [];
  for (let start = 0; ; ) {
    const { records = [], total = 0 } = (await api.query(scope, {
      queryType: 'chain',
      name: 'main',
      range: {
        start,
        expand: true,
      },
    })) as RecordRange<TxnEntry>;

    for (const r of records) {
      if (!isRecordOfDataTxn(r)) {
        continue;
      }
      const { entry } = r.value.message.transaction.body;
      if (predicate(entry)) {
        results.push(entry);
      }
    }
    start += records.length;
    if (start >= total) {
      break;
    }
  }
  return results;
}

function withPrefix(...prefix: string[]) {
  return (entry: DataEntry) =>
    prefix.every((s, i) => partAsHex(entry, i) === s);
}

function partAsHex(entry: DataEntry | Uint8Array[], i: number) {
  const part = entry instanceof Array ? entry[i] : entryParts(entry)[i];
  if (!part?.length) {
    return '';
  }
  return Buffer.from(part).toString('hex');
}

function entryParts(entry: DataEntry) {
  switch (entry.type) {
    case DataEntryType.Factom:
      return [entry.data, ...entry.extIds];
    default:
      return entry.data;
  }
}

async function queryAccount<C extends Ctor<core.Account>>(
  api: JsonRpcClient,
  url: URLArgs,
  type: C,
): Promise<InstanceType<C> | null> {
  const r = await api.query(url).catch(isErrorRecord);
  if (isRecordOf(r, Status.NotFound)) {
    // Account does not exist
    return null;
  }

  if (isRecordOf(r, type)) {
    // Account exists and is the specified type
    return r.account;
  }

  if (r.recordType === RecordType.Error) {
    // Some other error occurred
    throw new Error(r.value.message);
  }

  // Unknown error
  throw new Error(`An unexpected error occurred while retrieving ${url}`);
}
