import { Address } from 'accumulate.js';
import { Buffer, sha256 } from 'accumulate.js/lib/common';
import { DoubleHashDataEntry, Transaction } from 'accumulate.js/lib/core';

import { broadcast, prefix } from '../common/Shared';
import { EthPublicKey, Wallet } from './Wallet';

export type Entry = Note;

interface Note {
  type: 'note';
  value: string;
}

export const Backup = new (
  @prefix('web3:backup')
  class Backup {
    @broadcast accessor entries: Record<string, Entry> = {};

    get supported() {
      return Wallet.canEncrypt;
    }

    async chainFor(publicKey: Uint8Array) {
      const addr = new EthPublicKey(publicKey);
      const v = await sha256(await sha256(await backupToken(addr)));
      return `acc://${Buffer.from(v).toString('hex')}`;
    }

    async initialize(publicKey: Uint8Array) {
      const addr = new EthPublicKey(publicKey);
      const token = await backupToken(addr);
      const chainID = await sha256(await sha256(token));
      return new Transaction({
        header: {
          principal: `acc://${Buffer.from(chainID).toString('hex')}`,
        },
        body: {
          type: 'writeData',
          entry: {
            type: 'doubleHash',
            data: [new Uint8Array(), token],
          },
        },
      });
    }

    async decrypt(account: string, crypt: DoubleHashDataEntry) {
      if (crypt.data.length !== 3) {
        throw new Error('Invalid entry');
      }

      const hash = Buffer.from(await crypt.hash()).toString('hex');
      if (this.entries[hash]) {
        return this.entries[hash];
      }

      const entry = JSON.parse(
        await Wallet.decrypt(account, {
          nonce: Buffer.from(crypt.data[0]).toString('base64'),
          ephemPublicKey: Buffer.from(crypt.data[1]).toString('base64'),
          ciphertext: Buffer.from(crypt.data[2]).toString('base64'),
        }),
      );

      // Update the cache and broadcast
      this.entries[hash] = entry;
      this.entries = this.entries;
      return entry;
    }

    async encrypt(account: string, data: Entry) {
      const { nonce, ephemPublicKey, ciphertext } = await Wallet.encrypt(
        account,
        JSON.stringify(data),
      );

      return new DoubleHashDataEntry({
        data: [
          Buffer.from(nonce, 'base64'),
          Buffer.from(ephemPublicKey, 'base64'),
          Buffer.from(ciphertext, 'base64'),
        ],
      });
    }
  }
)();

// // Bug fix
// const bufferFrom = Buffer.from
// Buffer.from = function(...args) {
//     if (args[0] === '') {
//         return new Uint8Array([]);
//     }
//     return bufferFrom.apply(this, args);
// }

async function backupToken(address: Address) {
  if (!address.publicKeyHash) {
    throw new Error('cannot use address: has no hash');
  }
  // H(address, 'backup')
  return sha256(
    Buffer.concat(
      [await address.format(), 'backup'].map((x) => Buffer.from(x, 'utf-8')),
    ),
  );
}
