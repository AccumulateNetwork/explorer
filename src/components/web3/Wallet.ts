import { toChecksumAddress } from 'ethereumjs-util';
import Driver from 'web3';

import {
  BaseKey,
  PublicKeyAddress,
  PublicKeyHashAddress,
  SignOptions,
  Signer,
} from 'accumulate.js';
import { Buffer, sha256 } from 'accumulate.js/lib/common';
import {
  Signature,
  SignatureType,
  Transaction,
  TransactionArgs,
} from 'accumulate.js/lib/core';
import { encode } from 'accumulate.js/lib/encoding';

import { Settings } from './Settings';
import {
  Ethereum,
  ethAddress,
  hashMessage,
  keccak256,
  recoverPublicKey,
} from './utils';

export const Wallet = new (class Wallet {
  #driver?: Driver;

  get connected() {
    return !!this.#driver;
  }

  constructor() {
    switch (Settings.connected) {
      case 'Web3':
        if (Ethereum) {
          this.connectWeb3();
        }
    }
  }

  connectWeb3() {
    if (this.connected) {
      throw new Error('Already connected');
    }
    if (!Ethereum) {
      throw new Error('Web3 browser extension not found');
    }

    this.#driver = new Driver(Ethereum);
    Settings.connected = 'Web3';
  }

  async login(account: string): Promise<Uint8Array | undefined> {
    if (!this.connected) {
      this.connectWeb3();
    }

    const message = 'Login to Accumulate';
    const signature = await this.signEth(account, message, true);
    if (!signature) {
      return;
    }

    const publicKey = recoverPublicKey(signature, hashMessage(message));
    if (ethAddress(publicKey) !== account) {
      throw new Error('Failed to recover public key');
    }

    return publicKey;
  }

  async signEth(
    account: string | PublicKeyHashAddress,
    message: string | Uint8Array,
    personal = false,
  ) {
    if (typeof account !== 'string') {
      const short = Buffer.from(account.publicKeyHash.slice(-20));
      account = toChecksumAddress(`0x${short.toString('hex')}`);
    }
    if (typeof message !== 'string') {
      message = Buffer.from(message).toString('hex');
    }
    if (!message.startsWith('0x')) {
      message = '0x' + message;
    }

    if (Ethereum.isMetaMask && personal) {
      const sig = await Ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      });
      if (!sig) {
        return;
      }
      return Buffer.from(sig.replace(/^0x/, ''), 'hex');
    }

    if (!this.connected) {
      this.connectWeb3();
    }
    const sig = await this.#driver.eth.sign(message, account);
    if (!sig) {
      return;
    }
    return Buffer.from(sig.replace(/^0x/, ''), 'hex');
  }

  async signAccumulate(
    message: Uint8Array | Transaction,
    opts: SignOptions & { publicKey: Uint8Array },
  ) {
    const key = new Web3Key(opts.publicKey);
    const signer = await Signer.forPage(opts.signer, key);
    return await signer.sign(message, opts);
  }
})();

class Web3Key extends BaseKey {
  constructor(publicKey: Uint8Array) {
    super(new EthAddress(publicKey));
  }

  async signRaw(
    signature: Signature,
    message: Uint8Array,
  ): Promise<Uint8Array> {
    const sigMdHash = await sha256(encode(signature));
    const hash = await sha256(Buffer.concat([sigMdHash, message]));
    return await Wallet.signEth(this.address, hash);
  }
}

class EthAddress extends PublicKeyAddress {
  constructor(publicKey: Uint8Array) {
    if (publicKey[0] != 0x04) {
      publicKey = Buffer.concat([new Uint8Array([0x04]), publicKey]);
    }

    const keyHash = keccak256(publicKey.slice(1));
    super(SignatureType.ETH, keyHash, publicKey);
  }
}
