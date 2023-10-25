import { encrypt } from 'eth-sig-util';

import { PublicKeyHashAddress } from 'accumulate.js';
import { Buffer, sha256 } from 'accumulate.js/lib/common';
import { SignatureType, Transaction } from 'accumulate.js/lib/core';

// // Bug fix
// const bufferFrom = Buffer.from
// Buffer.from = function(...args) {
//     if (args[0] === '') {
//         return new Uint8Array([]);
//     }
//     return bufferFrom.apply(this, args);
// }

/**
 * Checks if backup functionality is supported for the connected Web3 provider.
 */
export function backupIsSupported() {
  // We only support backups using MetaMask
  return (window as any)?.ethereum?.isMetaMask;
}

const x25519_xsalsa20_poly1305 = (async () =>
  Buffer.from(
    await sha256(Buffer.from('x25519-xsalsa20-poly1305', 'utf-8')),
  ).toString('hex'))();

export async function decryptBackupEntry(account, entry) {
  if (!entry.header.metadata || entry.body.entry.data.length !== 3) {
    throw new Error('Invalid entry');
  }

  switch (entry.header.metadata) {
    case await x25519_xsalsa20_poly1305:
      const msg =
        '0x' +
        Buffer.from(
          JSON.stringify({
            version: 'x25519-xsalsa20-poly1305',
            nonce: Buffer.from(
              entry.body.entry.data[0] as string,
              'hex',
            ).toString('base64'),
            ephemPublicKey: Buffer.from(
              entry.body.entry.data[1] as string,
              'hex',
            ).toString('base64'),
            ciphertext: Buffer.from(
              entry.body.entry.data[2] as string,
              'hex',
            ).toString('base64'),
          }),
          'utf-8',
        ).toString('hex');

      return JSON.parse(
        await (window as any).ethereum.request({
          method: 'eth_decrypt',
          params: [msg, account],
        }),
      );

    default:
      throw new Error('Unknown encryption method');
  }
}

/**
 * Creates a backup entry.
 * @param {string} account The Ethereum address
 * @param  {any} data The data to encrypt
 */
export async function createBackupEntry(account, data) {
  const key = await getEncryptionPublicKey(account);
  const { version, nonce, ephemPublicKey, ciphertext } = encrypt(
    key,
    { data: JSON.stringify(data) },
    'x25519-xsalsa20-poly1305',
  );

  // const v = '0x'+ Buffer.from(JSON.stringify({ version: "x25519-xsalsa20-poly1305", nonce, ephemPublicKey, ciphertext }), 'utf-8').toString('hex');
  // const asdf = await window.ethereum.request({
  //     "method": "eth_decrypt",
  //     "params": [v, account]
  // });
  // console.log(asdf);

  const token = await backupToken(await ethToUniversal(account));
  const chainID = await sha256(await sha256(token));
  return new Transaction({
    header: {
      principal: `acc://${Buffer.from(chainID).toString('hex')}`,
      metadata: await sha256(Buffer.from(version, 'utf-8')),
    },
    body: {
      type: 'writeData',
      entry: {
        type: 'doubleHash',
        data: [
          Buffer.from(nonce, 'base64'),
          Buffer.from(ephemPublicKey, 'base64'),
          Buffer.from(ciphertext, 'base64'),
        ],
      },
    },
  });
}

async function getEncryptionPublicKey(account) {
  if (!backupIsSupported()) {
    throw new Error(`Backup not supported for connected Web3 provider`);
  }

  return await (window as any).ethereum.request({
    method: 'eth_getEncryptionPublicKey',
    params: [account],
  });
}

/**
 * Converts an Ethereum address into an AIP-001 address.
 * @param {string} address
 * @returns {PublicKeyHashAddress}
 */
export function ethToUniversal(address) {
  const bytes = Buffer.from(address.substring(2), 'hex');
  return new PublicKeyHashAddress(SignatureType.ETH, bytes);
}

/**
 * Derives the URL of the LDA used to backup the given AIP-001 address.
 * @param {Address} address
 */
export async function deriveBackupLDA(address) {
  // Simulate creating an LDA with H(address, 'backup') as the first extid
  const v = await sha256(await sha256(await backupToken(address)));
  return `acc://${Buffer.from(v).toString('hex')}`;
}

/**
 * Constructs the WriteData transaction needed to create the LDA used to backup
 * the given AIP-001 address.
 * @param {Address} address
 */
export async function createBackupLDATxn(address) {
  const token = await backupToken(address);
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

/**
 * Derives the token for the LDA used to backup the given AIP-001 address.
 * @param {Address} address
 */
async function backupToken(address) {
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
