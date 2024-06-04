import { toChecksumAddress } from 'ethereumjs-util';
import newKeccak from 'keccak';
import { ecdsaRecover } from 'secp256k1';

import { Buffer, sha256 } from 'accumulate.js/lib/common';

function keccak(name: string): (msg: Uint8Array) => Uint8Array {
  return (msg) => {
    const hash = newKeccak(name);
    hash.update(Buffer.from(msg));
    return hash.digest();
  };
}

export const keccak224 = keccak('keccak224');
export const keccak256 = keccak('keccak256');
export const keccak384 = keccak('keccak384');
export const keccak512 = keccak('keccak512');

export const Ethereum = window.ethereum;

export function ethAddress(pub: Uint8Array | string) {
  if (typeof pub === 'string') {
    pub = Buffer.from(pub, 'hex');
  }
  if (pub[0] == 0x04) {
    pub = pub.slice(1);
  }
  const hash = keccak256(pub);
  const addr = '0x' + Buffer.from(hash.slice(-20)).toString('hex');
  return toChecksumAddress(addr);
}

export function isLedgerError(error) {
  // Extract the Ledger error
  if (error.message.startsWith('Ledger device: ')) {
    const i = error.message.indexOf('\n');
    try {
      const { originalError } = JSON.parse(error.message.substring(i + 1));
      if (originalError) error = originalError;
    } catch (_) {}
  }

  // Parse the status code
  if ('statusCode' in error) {
    // eslint-disable-next-line default-case
    switch (error.statusCode) {
      case 0x6d02:
      case 0x6511:
        return new Error('Ledger: the Accumulate app is not running');
      case 0x530c:
      case 0x6b0c:
      case 0x5515:
        return new Error('Ledger: device is locked');
    }
  }

  return error;
}

export function hashMessage(message: Uint8Array | string) {
  if (typeof message === 'string') {
    message = Buffer.from(message);
  }
  var preamble = Buffer.from(`\x19Ethereum Signed Message:\n${message.length}`);
  var ethMessage = Buffer.concat([preamble, message]);
  return Buffer.from(keccak256(ethMessage));
}

export function recoverPublicKey(signature: Uint8Array, hash: Uint8Array) {
  // Split into v-value and sig
  const sigOnly = signature.slice(0, signature.length - 1);
  const vValue = signature.slice(-1);

  const recoveryNumber = vValue[0] === 0x1c ? 1 : 0;
  const publicKey = ecdsaRecover(sigOnly, recoveryNumber, hash, false);

  // Remove leading '04'
  return publicKey;
}

export async function liteIDForEth(publicKey: Uint8Array) {
  if (publicKey[0] == 0x04) {
    publicKey = publicKey.slice(1);
  }
  const ethHash = keccak256(publicKey).slice(-20);
  const ethAddr = Buffer.from(ethHash).toString('hex');
  const hashHash = await sha256(Buffer.from(ethAddr));
  const checkSum = Buffer.from(hashHash.slice(28)).toString('hex');

  return `acc://${ethAddr}${checkSum}`;
}

export const truncateAddress = (address?: string) => {
  if (!address) return 'No Account';
  const match = address.match(
    /^(0x[a-zA-Z0-9]{5})[a-zA-Z0-9]+([a-zA-Z0-9]{5})$/,
  );
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};
