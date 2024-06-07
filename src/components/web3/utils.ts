import { ecdsaRecover } from 'secp256k1';

import { Buffer, keccak256 } from 'accumulate.js/lib/common';

export const Ethereum = window.ethereum;

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
