import nacl from 'tweetnacl';

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
  LiteDataAccount,
  TransactionArgs,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { TxnEntry, isRecordOf, isRecordOfDataTxn } from '../../utils/types';
import { broadcast, prefix, storage, stored } from '../common/Shared';
import { isErrorRecord } from '../common/query';
import { EthPublicKey, Wallet } from './Wallet';
import { ethAddress } from './utils';

export type Entry = Note;

interface Note {
  type: 'note';
  value: string;
}

type SignAccumulate = (txn: TransactionArgs) => Promise<boolean>;

@prefix('web3:backup')
@storage(localStorage)
export class Backup {
  static readonly #for = new Map<string, Backup>();

  @broadcast @stored static accessor #keys: Record<string, string> = {};

  static get supported() {
    return Wallet.canEncrypt;
  }

  static for(publicKey: Uint8Array) {
    return new this(publicKey);
  }

  readonly #publicKey: Uint8Array;
  #account: LiteDataAccount;
  #rawEntries: DataEntry[];
  #encryptionKey: Uint8Array;
  #entries: { [hash: string]: Entry };

  // TODO: this should be private, but that screws up the decorators
  constructor(publicKey: Uint8Array) {
    const key = Buffer.from(publicKey).toString('hex');
    if (Backup.#for.has(key)) {
      return Backup.#for.get(key);
    }

    this.#publicKey = publicKey;
    Backup.#for.set(key, this);
  }

  get entries(): { readonly [hash: string]: Entry } {
    return this.#entries;
  }

  get account() {
    return this.#account;
  }

  get hasKey() {
    return !!this.#encryptionKey;
  }

  async chain() {
    const v = await sha256(await sha256(await this.#token('backup')));
    return `acc://${Buffer.from(v).toString('hex')}`;
  }

  async #token(suffix: string) {
    const addr = new EthPublicKey(this.#publicKey);
    return sha256(Buffer.from(`${await addr.format()}:${suffix}`, 'utf-8'));
  }

  async load(api: JsonRpcClient) {
    // Check that the LDA exists
    if (!(await this.#loadAccount(api))) {
      return;
    }

    // Load all the data entries
    await this.#loadEntries(api);

    // Locate the encryption key
    await this.#locateKey();

    // Decrypt the entries
    await this.#decryptEntries();
  }

  async #loadAccount(api: JsonRpcClient) {
    if (this.#account) {
      return;
    }

    const principal = await this.chain();

    // Does the LDA exist?
    const r = await api.query(principal).catch(isErrorRecord);
    if (isRecordOf(r, LiteDataAccount)) {
      // Yes
      this.#account = r.account;
      return true;
    }

    if (isRecordOf(r, Status.NotFound)) {
      // No, create it
      return false;
    }

    if (r.recordType === RecordType.Error) {
      // Some other error occurred
      throw new Error(r.value.message);
    }

    // Unknown error
    throw new Error(
      'An unexpected error occurred while retrieving the backup account',
    );
  }

  async #loadEntries(api: JsonRpcClient) {
    if (this.#rawEntries) {
      return;
    }

    const principal = await this.chain();
    const tokens = [
      // The token for entries
      (await this.#token('entry')).toString('hex'),
      // The token for the encryption key
      (await this.#token('key')).toString('hex'),
    ];

    this.#rawEntries = [];
    for (let start = 0; ; ) {
      const { records = [], total = 0 } = (await api.query(principal, {
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
        if (!tokens.includes(partAsHex(entry, 0))) {
          continue;
        }
        this.#rawEntries.push(entry);
      }
      start += records.length;
      if (start >= total) {
        break;
      }
    }
  }

  async #locateKey() {
    if (this.#encryptionKey) {
      return;
    }

    // Find a entry that's been marked with key:eth_decrypt and attempt to
    // decrypt it.
    const keyToken = (await this.#token('key')).toString('hex');
    const ethToken = (await this.#token('eth_decrypt')).toString('hex');

    for (const entry of this.#rawEntries) {
      if (partAsHex(entry, 0) !== keyToken) {
        continue;
      }
      if (partAsHex(entry, 1) !== ethToken) {
        continue;
      }
      const entryHash = Buffer.from(await entry.hash()).toString('hex');
      if (entryHash in Backup.#keys) {
        this.#encryptionKey = Buffer.from(Backup.#keys[entryHash], 'hex');
        return;
      }

      const parts = entryParts(entry).slice(2);
      if (parts.length < 3) {
        continue;
      }
      const hex = JSON.parse(
        await Wallet.decrypt(ethAddress(this.#publicKey), {
          nonce: Buffer.from(parts[0]).toString('base64'),
          ephemPublicKey: Buffer.from(parts[1]).toString('base64'),
          ciphertext: Buffer.from(parts[2]).toString('base64'),
        }),
      );
      this.#encryptionKey = Buffer.from(hex, 'hex');
      Backup.#keys = {
        ...Backup.#keys,
        [entryHash]: hex,
      };
      return;
    }
  }

  async #decryptEntries() {
    if (!this.#encryptionKey || !this.#rawEntries || this.#entries) {
      return;
    }

    const keyHash = (await sha256(this.#encryptionKey)).toString('hex');
    const entryToken = (await this.#token('entry')).toString('hex');
    const keyToken = (await this.#token(keyHash)).toString('hex');
    this.#entries = {};
    for (const dataEntry of this.#rawEntries) {
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
      const plain = nacl.secretbox.open(message, nonce, this.#encryptionKey);
      if (!plain) {
        continue;
      }
      const hash = Buffer.from(await dataEntry.hash()).toString('hex');
      this.#entries[hash] = JSON.parse(Buffer.from(plain).toString('utf-8'));
    }
  }

  async initialize(sign: SignAccumulate) {
    return await sign({
      header: {
        principal: await this.chain(),
      },
      body: {
        type: 'writeData',
        entry: {
          type: 'doubleHash',
          data: [new Uint8Array(), await this.#token('backup')],
        },
      },
    });
  }

  async generateKey(sign: SignAccumulate) {
    // Generate a new key using NaCl
    const key = await nacl.randomBytes(nacl.secretbox.keyLength);

    // Encrypt it using Metamask
    const { nonce, ephemPublicKey, ciphertext } = await Wallet.encrypt(
      ethAddress(this.#publicKey),
      JSON.stringify(Buffer.from(key).toString('hex')),
    );

    // Store the encrypted key
    const ok = await sign({
      header: {
        principal: await this.chain(),
      },
      body: {
        type: 'writeData',
        entry: {
          type: 'doubleHash',
          data: [
            await this.#token('key'),
            await this.#token('eth_decrypt'),
            Buffer.from(nonce, 'base64'),
            Buffer.from(ephemPublicKey, 'base64'),
            Buffer.from(ciphertext, 'base64'),
          ],
        },
      },
    });
    if (!ok) {
      return false;
    }

    this.#encryptionKey = key;
    return true;
  }

  async addEntry(sign: SignAccumulate, entry: Entry) {
    const keyHash = await sha256(this.#encryptionKey);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const message = Buffer.from(JSON.stringify(entry), 'utf-8');
    const box = nacl.secretbox(message, nonce, this.#encryptionKey);

    const dataEntry = new DoubleHashDataEntry({
      data: [
        await this.#token('entry'),
        await this.#token(keyHash.toString('hex')),
        Buffer.concat([nonce, box]),
      ],
    });
    const ok = await sign({
      header: {
        principal: await this.chain(),
      },
      body: {
        type: 'writeData',
        entry: dataEntry,
      },
    });
    if (!ok) {
      return false;
    }

    const entryHash = Buffer.from(await dataEntry.hash()).toString('hex');
    this.#entries[entryHash] = entry;
    return true;
  }
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
