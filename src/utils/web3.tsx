import { message } from 'antd';
import { toChecksumAddress } from 'ethereumjs-util';
import newKeccak from 'keccak';

import { Buffer, sha256 } from 'accumulate.js/lib/common';
import { KeySignature } from 'accumulate.js/lib/core';
import { encode } from 'accumulate.js/lib/encoding';

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

export function ethAddress(pub: Uint8Array | string) {
  if (typeof pub === 'string') {
    pub = Buffer.from(pub, 'hex');
  }
  const hash = keccak256(pub);
  const addr = '0x' + Buffer.from(hash.slice(-20)).toString('hex');
  return toChecksumAddress(addr);
}

/* global BigInt */

export const truncateAddress = (address?: string) => {
  if (!address) return 'No Account';
  const match = address.match(
    /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/,
  );
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};

export const ethToAccumulate = async (
  address?: string,
  type = 'liteIdentity',
) => {
  if (!address) return 'No Account';
  let pubKey = address.substring(2).toLowerCase();
  if (type === 'publicKey') {
    return pubKey;
  }
  let checkSum = Buffer.from(await sha256(Buffer.from(pubKey))).toString('hex');
  let accumulate = 'acc://' + pubKey + checkSum.substring(56);
  if (type === 'liteTokenAccount') {
    accumulate += '/ACME';
  }
  return accumulate;
};

export const liteIdentityToLiteTokenAccount = (address) => {
  if (!address) return 'No Account';
  return address + '/ACME';
};

export const txHash = async (tx) => {
  try {
    let headerBuffer = joinBuffers([
      Buffer.from([1]),
      Buffer.from([tx.header.principal.length]),
      Buffer.from(tx.header.principal),
      Buffer.from([2]),
      Buffer.from(tx.header.initiator, 'hex'),
    ]);

    console.log('Tx.Header Bytes:', Buffer.from(headerBuffer).toString('hex'));

    let headerHash = Buffer.from(await sha256(headerBuffer));
    console.log('Tx.Header Hash:', headerHash.toString('hex'));

    let amount = Number.parseInt(tx.body.amount);

    console.log('Tx amount:', amount);
    let amountBytes = numberToBytes(amount);
    console.log('Tx amount (hex):', Buffer.from(amountBytes).toString('hex'));
    console.log('Bytes length:', amountBytes.length);

    let txCodes = {
      addCredits: 14,
    };

    let bodyBuffer = Buffer.from([1]);

    switch (tx.body.type) {
      case 'addCredits':
        bodyBuffer = joinBuffers([
          bodyBuffer,
          Buffer.from([txCodes[tx.body.type]]),
          Buffer.from([2]),
          Buffer.from([tx.body.recipient.length]),
          Buffer.from(tx.body.recipient),
          Buffer.from([3]),
          Buffer.from([amountBytes.byteLength]),
          Buffer.from(amountBytes),
          Buffer.from([4]),
          Buffer.from(uvarintMarshalBinary(tx.body.oracle)),
        ]);
        break;
      default:
        break;
    }

    console.log('Tx.Body Bytes:', Buffer.from(bodyBuffer).toString('hex'));

    let bodyHash = Buffer.from(await sha256(bodyBuffer));
    console.log('Tx.Body Hash:', bodyHash.toString('hex'));

    let concatenatedHash = joinBuffers([
      Buffer.from(headerHash),
      Buffer.from(bodyHash),
    ]);

    console.log(
      'Tx.HeaderHash+Tx.BodyHash:',
      Buffer.from(concatenatedHash).toString('hex'),
    );

    let txHash = Buffer.from(await sha256(concatenatedHash));

    /*
        // tx struct, not needed
        let txBuffer = joinBuffers([
            Buffer.from([1], 'hex'),
            Buffer.from([headerBuffer.length + 1], 'hex'),
            Buffer.from(headerBuffer),
            Buffer.from([2], 'hex'),
            Buffer.from([bodyBuffer.length + 1], 'hex'),
            Buffer.from(bodyBuffer),
        ]);
        */

    return txHash;
  } catch (error) {
    message.error(`${error}`);
  }
};

export const sigMdHash = async (sig: KeySignature) => {
  sig = sig.copy();
  sig.transactionHash = null;
  sig.signature = null;
  return await sha256(encode(sig));
};

export const rsvSigToDER = async (sig) => {
  try {
    sig = sig.split('x')[1];

    let sigBuffer = joinBuffers([
      Buffer.from('3044', 'hex'),
      Buffer.from('0220', 'hex'),
      Buffer.from(sig.substring(0, 64), 'hex'),
      Buffer.from('0220', 'hex'),
      Buffer.from(sig.substring(64, 128), 'hex'),
    ]);

    console.log('DER sig:', Buffer.from(sigBuffer).toString('hex'));

    return sigBuffer;
  } catch (error) {
    message.error(`${error}`);
  }
};

export const joinBuffers = (buffers: Uint8Array[], delimiter = '') => {
  let d = Buffer.from(delimiter);
  return buffers.reduce((prev, b) => Buffer.concat([prev, d, b]));
};

export const uvarintMarshalBinary = (val: number | bigint, field?: number) => {
  if (typeof val === 'number' && val > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      'Cannot marshal binary number greater than MAX_SAFE_INTEGER. Use bigint instead.',
    );
  }

  let x = BigInt(val);
  const buffer = [];
  let i = 0;

  while (x >= 0x80) {
    buffer[i] = Number((x & 0xffn) | 0x80n);
    x >>= 7n;
    i++;
  }

  buffer[i] = Number(x & 0xffn);
  const data = Buffer.from(buffer);

  return field ? fieldMarshalBinary(field, data) : data;
};

export const fieldMarshalBinary = (field, val) => {
  if (field < 1 || field > 32) {
    throw new Error(`Field number is out of range [1, 32]: ${field}`);
  }
  return Buffer.concat([uvarintMarshalBinary(field), val]);
};

export const numberToBytes = (number) => {
  if (!Number.isSafeInteger(number)) {
    throw new Error('Number is out of range');
  }

  const size = number === 0 ? 0 : byteLength(number);
  const bytes = new Uint8Array(size);
  let x = number;
  for (let i = size - 1; i >= 0; i--) {
    const rightByte = x & 0xff;
    bytes[i] = rightByte;
    x = Math.floor(x / 0x100);
  }

  return Buffer.from(bytes);
};

export const bitLength = (number) => {
  return Math.floor(Math.log2(number)) + 1;
};

export const byteLength = (number) => {
  return Math.ceil(bitLength(number) / 8);
};
