import { InjectedConnector } from '@web3-react/injected-connector';
import { EthEncryptedData, encrypt } from 'eth-sig-util';
import { toChecksumAddress } from 'ethereumjs-util';
import Driver from 'web3';

import {
  BaseKey,
  PublicKeyAddress,
  PublicKeyHashAddress,
  SignOptions,
  Signer,
  URL,
} from 'accumulate.js';
import { Buffer, keccak256, sha256 } from 'accumulate.js/lib/common';
import { Signature, SignatureType, Transaction } from 'accumulate.js/lib/core';
import { encode } from 'accumulate.js/lib/encoding';

import { Settings } from './Settings';
import { Ethereum, hashMessage, recoverPublicKey } from './utils';

type EncryptedData = Omit<EthEncryptedData, 'version'>;

export const Wallet = new (class Wallet {
  #driver?: Driver;
  readonly connector = new InjectedConnector({});

  get canConnect() {
    return !!Ethereum;
  }

  get connected() {
    return !!this.#driver;
  }

  get canEncrypt() {
    return Ethereum?.isMetaMask;
  }

  constructor() {
    if (Ethereum && Settings.connected) {
      this.connect();
    }
  }

  connect(type: 'Web3' = Settings.connected) {
    if (this.connected) {
      throw new Error('Already connected');
    }
    if (!Ethereum) {
      throw new Error('Web3 browser extension not found');
    }

    this.#driver = new Driver(Ethereum);
    Settings.connected = type;
  }

  disconnect() {
    this.#driver = null;
    Settings.connected = null;
  }

  async login(account: string): Promise<EthPublicKey | undefined> {
    if (!this.connected) {
      this.connect();
    }

    const message = 'Login to Accumulate';
    const signature = await this.signEth(account, message, true);
    if (!signature) {
      return;
    }

    const publicKey = EthPublicKey.recover(signature, hashMessage(message));
    if (publicKey.ethereum.toLowerCase() !== account.toLowerCase()) {
      throw new Error('Failed to recover public key');
    }

    return publicKey;
  }

  async signEth(
    account: string | PublicKeyHashAddress,
    message: string | Uint8Array,
    personal = false,
  ) {
    if (!this.connected) {
      this.connect();
    }

    if (typeof account !== 'string') {
      const short = Buffer.from(account.publicKeyHash.slice(-20));
      account = toChecksumAddress(`0x${short.toString('hex')}`);
    }
    if (typeof message !== 'string') {
      message = '0x' + Buffer.from(message).toString('hex');
    }

    if (Ethereum?.isMetaMask && personal) {
      const sig = (await Ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      })) as string;
      if (!sig) {
        return;
      }
      return Buffer.from(sig.replace(/^0x/, ''), 'hex');
    }

    if (!this.connected) {
      this.connect();
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
    const key = new Web3Signer(opts.publicKey);
    const signer = Signer.forPage(opts.signer, key);
    return await signer.sign(message, opts);
  }

  async decrypt(account: string, data: EncryptedData): Promise<string> {
    if (!this.connected) {
      this.connect();
    }
    if (!this.canEncrypt) {
      throw new Error('Encryption not supported for current Web3 connector');
    }

    const s = JSON.stringify({
      version: 'x25519-xsalsa20-poly1305',
      ...data,
    });
    const message = '0x' + Buffer.from(s).toString('hex');
    return (await Ethereum.request({
      method: 'eth_decrypt',
      params: [message, account],
    })) as string;
  }

  async encrypt(account: string, data: string): Promise<EncryptedData> {
    if (!this.connected) {
      this.connect();
    }
    if (!this.canEncrypt) {
      throw new Error('Encryption not supported for current Web3 connector');
    }

    const key = (await Ethereum.request({
      method: 'eth_getEncryptionPublicKey',
      params: [account],
    })) as string;
    const encrypted = encrypt(key, { data }, 'x25519-xsalsa20-poly1305');
    delete encrypted.version;
    return encrypted;
  }
})();

export class Web3Signer extends BaseKey {
  constructor(publicKey: Uint8Array) {
    super(new EthPublicKey(publicKey));
  }

  async signRaw(
    signature: Signature,
    message: Uint8Array,
  ): Promise<Uint8Array> {
    const sigMdHash = sha256(encode(signature));
    const hash = sha256(Buffer.concat([sigMdHash, message]));
    return await Wallet.signEth(this.address, hash);
  }
}

export class EthPublicKey extends PublicKeyAddress {
  static recover(signature: Uint8Array, hash: Uint8Array) {
    return new this(recoverPublicKey(signature, hash));
  }

  constructor(publicKey: Uint8Array) {
    if (publicKey[0] != 0x04) {
      publicKey = Buffer.concat([new Uint8Array([0x04]), publicKey]);
    }

    const keyHash = keccak256(publicKey.slice(1)).slice(-20);
    super(SignatureType.ETH, keyHash, publicKey);
  }

  get ethereum() {
    return toChecksumAddress(`${this}`);
  }

  get lite() {
    const eth = Buffer.from(this.publicKeyHash).toString('hex');
    const hashHash = sha256(Buffer.from(eth));
    const checkSum = Buffer.from(hashHash.slice(28)).toString('hex');
    return URL.parse(`acc://${eth}${checkSum}`);
  }
}
