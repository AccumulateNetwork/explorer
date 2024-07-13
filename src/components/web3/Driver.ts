import { EthEncryptedData, encrypt } from 'eth-sig-util';
import { toChecksumAddress } from 'ethereumjs-util';
import { ecdsaRecover } from 'secp256k1';
import Web3 from 'web3';
import type { provider } from 'web3-core';

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

import { NetworkConfig } from '../common/networks';

type EncryptedData = Omit<EthEncryptedData, 'version'>;

export class Driver {
  static get canConnect() {
    return !!window.ethereum;
  }

  static get canEncrypt() {
    return window.ethereum?.isMetaMask;
  }

  readonly web3: Web3;
  readonly sign: Sign;

  constructor(provider: provider) {
    this.web3 = new Web3(provider);
    this.sign = new Sign(this.web3);
  }

  async decrypt(publicKey: EthPublicKey, data: EncryptedData): Promise<string> {
    if (!Driver.canEncrypt) {
      throw new Error('Encryption not supported for current Web3 connector');
    }

    const s = JSON.stringify({
      version: 'x25519-xsalsa20-poly1305',
      ...data,
    });
    const message = '0x' + Buffer.from(s).toString('hex');
    return (await window.ethereum.request({
      method: 'eth_decrypt',
      params: [message, publicKey.ethereum],
    })) as string;
  }

  async encrypt(publicKey: EthPublicKey, data: string): Promise<EncryptedData> {
    if (!Driver.canEncrypt) {
      throw new Error('Encryption not supported for current Web3 connector');
    }

    const key = (await window.ethereum.request({
      method: 'eth_getEncryptionPublicKey',
      params: [publicKey.ethereum],
    })) as string;
    const encrypted = encrypt(key, { data }, 'x25519-xsalsa20-poly1305');
    delete encrypted.version;
    return encrypted;
  }

  async switchChains(network: NetworkConfig) {
    const { ethereum } = window;

    if (!network?.eth?.length) {
      return;
    }

    const chainId = await fetch(`${network.eth[0]}`, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: {},
      }),
    })
      .then((r) => r.json())
      .then((r) => r.result)
      .catch((e) => (console.warn(e), null));
    if (typeof chainId !== 'string') {
      return;
    }

    try {
      // Attempt to switch to Accumulate
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (error) {
      if (typeof error === 'object' && 'code' in error && error.code === 4902) {
        // Chain doesn't exist
      } else {
        console.warn(error);
        return;
      }
    }

    try {
      // Add Accumulate
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            blockExplorerUrls: [
              network.explorer || 'https://explorer.accumulatenetwork.io',
            ],
            iconUrls: [
              'https://explorer.accumulatenetwork.io/static/media/logo.64085dfd.svg',
            ],
            nativeCurrency: {
              name: 'ACME',
              symbol: 'ACME',
              decimals: 18, // MetaMask won't allow any value except 18 - WTF?
            },
            rpcUrls: network.eth,
            chainId,
            chainName: `Accumulate ${network.label}`,
          },
        ],
      });

      // Switch to the new chain
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (error) {
      console.warn(error);
      return;
    }
  }
}

class Sign {
  readonly #web3: Web3;

  constructor(web3: Web3) {
    this.#web3 = web3;
  }

  async eth(
    account: string | PublicKeyHashAddress,
    message: string | Uint8Array,
    personal = false,
  ) {
    if (typeof account !== 'string') {
      const short = Buffer.from(account.publicKeyHash.slice(-20));
      account = toChecksumAddress(`0x${short.toString('hex')}`);
    }
    if (typeof message !== 'string') {
      message = '0x' + Buffer.from(message).toString('hex');
    }

    try {
      if (window.ethereum?.isMetaMask && personal) {
        const sig = (await window.ethereum.request({
          method: 'personal_sign',
          params: [message, account],
        })) as string;
        if (!sig) {
          return;
        }
        return Buffer.from(sig.replace(/^0x/, ''), 'hex');
      }

      const sig = await this.#web3.eth.sign(message, account);
      if (!sig) {
        return;
      }
      return Buffer.from(sig.replace(/^0x/, ''), 'hex');
    } catch (error) {
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
            throw new Error('Ledger: the Accumulate app is not running');
          case 0x530c:
          case 0x6b0c:
          case 0x5515:
            throw new Error('Ledger: device is locked');
        }
      }

      throw error;
    }
  }

  accumulate(
    message: Uint8Array | Transaction,
    opts: SignOptions & { publicKey: Uint8Array },
  ) {
    const pub = new EthPublicKey(opts.publicKey);
    const key = new AccKey(pub, (hash) => this.eth(pub.ethereum, hash));
    const signer = Signer.forPage(opts.signer, key);
    return signer.sign(message, opts);
  }
}

export class EthPublicKey extends PublicKeyAddress {
  static recover(signature: Uint8Array, message: Uint8Array | string) {
    const sigOnly = signature.slice(0, signature.length - 1);
    const vValue = signature.slice(-1);

    const recoveryNumber = vValue[0] === 0x1c ? 1 : 0;
    const hash = hashMessage(message);
    const publicKey = ecdsaRecover(sigOnly, recoveryNumber, hash, false);

    return new this(publicKey);
  }

  constructor(publicKey: Uint8Array) {
    if (publicKey[0] != 0x04) {
      publicKey = Buffer.concat([new Uint8Array([0x04]), publicKey]);
    }

    const keyHash = keccak256(publicKey.slice(1)).slice(-20);
    super(SignatureType.ETH, keyHash, publicKey);
  }

  get ethereum(): string {
    return toChecksumAddress(`${this}`);
  }

  get lite() {
    const eth = Buffer.from(this.publicKeyHash).toString('hex');
    const hashHash = sha256(Buffer.from(eth));
    const checkSum = Buffer.from(hashHash.slice(28)).toString('hex');
    return URL.parse(`acc://${eth}${checkSum}`);
  }
}

class AccKey extends BaseKey {
  readonly #sign: (_: Uint8Array) => Promise<Uint8Array>;

  constructor(
    publicKey: EthPublicKey,
    sign: (_: Uint8Array) => Promise<Uint8Array>,
  ) {
    super(publicKey);
    this.#sign = sign;
  }

  async signRaw(
    signature: Signature,
    message: Uint8Array,
  ): Promise<Uint8Array> {
    const sigMdHash = sha256(encode(signature));
    const hash = sha256(Buffer.concat([sigMdHash, message]));
    return await this.#sign(hash);
  }
}

function hashMessage(message: Uint8Array | string) {
  if (typeof message === 'string') {
    message = Buffer.from(message);
  }
  var preamble = Buffer.from(`\x19Ethereum Signed Message:\n${message.length}`);
  var ethMessage = Buffer.concat([preamble, message]);
  return Buffer.from(keccak256(ethMessage));
}
