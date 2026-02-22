import type { MetaMaskInpageProvider } from '@metamask/providers';
import { EthEncryptedData, encrypt } from 'eth-sig-util';
import { toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import { ecdsaRecover } from 'secp256k1';

import {
  BaseKey,
  PublicKeyAddress,
  SignOptions,
  Signable,
  Signer,
  URL,
} from 'accumulate.js';
import { RpcError } from 'accumulate.js/lib/api_v3';
import { Buffer, keccak256, sha256 } from 'accumulate.js/lib/common';
import {
  KeySignature,
  Signature,
  SignatureType,
  Transaction,
  TypedDataSignature,
} from 'accumulate.js/lib/core';
import { encode } from 'accumulate.js/lib/encoding';

import { NetworkConfig } from '../common/networks';

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & MetaMaskInpageProvider;
  }
}

type EncryptedData = Omit<EthEncryptedData, 'version'>;

export interface TypedDataMessage {
  domain: ethers.TypedDataDomain;
  types: Record<string, ethers.TypedDataField[]>;
  primaryType: string;
  message: Record<string, any>;
}

export class Driver {
  static get canConnect() {
    return !!window.ethereum;
  }

  static get canEncrypt() {
    return false;
    // return window.ethereum?.isMetaMask;
  }

  readonly #web3: ethers.BrowserProvider;

  constructor(provider: ethers.Eip1193Provider) {
    this.#web3 = new ethers.BrowserProvider(provider);
  }

  async connect() {
    await this.#web3.getSigner();
  }

  async listAccounts() {
    const accounts = await this.#web3.listAccounts();
    return accounts.map((x) => x.address);
  }

  static async getChainID(network: NetworkConfig): Promise<string> {
    if (!network?.eth?.length) {
      return;
    }

    return await fetch(network.eth[0], {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: {},
      }),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.error) {
          throw new RpcError(r.error);
        }
        return r.result;
      })
      .catch((e) => (console.warn(e), null));
  }

  async switchChains(network: NetworkConfig) {
    const { ethereum } = window;

    const chainId = await Driver.getChainID(network);
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

  async signEthMessage(account: string, message: string) {
    try {
      const signer = await this.#web3.getSigner(account);
      const sig = await signer.signMessage(message);
      return Buffer.from(sig.replace(/^0x/, ''), 'hex');
    } catch (error) {
      this.#checkError(error);
    }
  }

  async signEthTypedData(
    account: string,
    { domain, types, message }: TypedDataMessage,
  ) {
    try {
      delete types.EIP712Domain;
      const signer = await this.#web3.getSigner(account);
      const sig = await signer.signTypedData(domain, types, message);
      return Buffer.from(sig.replace(/^0x/, ''), 'hex');
    } catch (error) {
      this.#checkError(error);
    }
  }

  async signEthBlind(account: string, hash: Uint8Array) {
    try {
      const signer = await this.#web3.getSigner(account);
      const sig = await signer._legacySignMessage(hash);
      return Buffer.from(sig.replace(/^0x/, ''), 'hex');
    } catch (error) {
      this.#checkError(error);
    }
  }

  #checkError(error) {
    if (typeof error !== 'object') {
      throw error;
    }

    if (
      ('code' in error && error.code === 4001) ||
      ('cause' in error &&
        typeof error.cause === 'object' &&
        'code' in error.cause &&
        error.cause.code === 4001)
    ) {
      return; // User rejected the request
    }

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

  signAccumulate(
    network: NetworkConfig,
    message: Transaction,
    opts: SignOptions & { publicKey: Uint8Array },
  ) {
    const pub = new EthPublicKey(opts.publicKey);
    const key = new AccKey(pub, network, (hash) =>
      hash instanceof Uint8Array
        ? this.signEthBlind(pub.ethereum, hash)
        : this.signEthTypedData(pub.ethereum, hash),
    );
    const signer = Signer.forPage(opts.signer, key);
    return signer.sign(message, opts);
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
  readonly #network: NetworkConfig;
  readonly #sign: (_: Uint8Array | TypedDataMessage) => Promise<Uint8Array>;

  constructor(
    publicKey: EthPublicKey,
    network: NetworkConfig,
    sign: (_: Uint8Array | TypedDataMessage) => Promise<Uint8Array>,
  ) {
    super(publicKey);
    this.#network = network;
    this.#sign = sign;
  }

  #useTypedData(message: Signable): message is Transaction {
    if (!(message instanceof Transaction)) {
      return false;
    }

    return !!this.#network.eth?.length;
  }

  protected async initSignature(
    message: Signable,
    opts: SignOptions,
  ): Promise<KeySignature> {
    // If the network doesn't have an eth endpoint, use a plain ETH signature
    if (!this.#useTypedData(message)) {
      return super.initSignature(message, opts);
    }

    const chainID = await fetch(this.#network.eth[0], {
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
      .catch((e) =>
        Promise.reject(new Error('Unable to resolve chain ID', { cause: e })),
      );

    return new TypedDataSignature({
      chainID: BigInt(chainID),
      publicKey: this.address.publicKey,
      signer: opts.signer,
      signerVersion: opts.signerVersion,
      timestamp: opts.timestamp,
      vote: opts.vote,
    });
  }

  async signRaw(signature: Signature, message: Signable): Promise<Uint8Array> {
    // If the network doesn't have an eth endpoint, blind sign
    if (!this.#useTypedData(message)) {
      const sigMdHash = sha256(encode(signature));
      const hash = sha256(Buffer.concat([sigMdHash, message.hash()]));
      return await this.#sign(hash);
    }

    const typedData: TypedDataMessage = await fetch(this.#network.eth[0], {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'acc_typedData',
        params: {
          transaction: message.asObject(),
          signature: signature.asObject(),
        },
      }),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.error) {
          throw new RpcError(r.error);
        }
        return r.result;
      })
      .catch((e) =>
        Promise.reject(
          new Error('Unable to construct typed data', { cause: e }),
        ),
      );

    // Convert strings to Uint8Array to make ethers happy
    typedData.message = conditionTypedData(
      typedData.message,
      typedData.primaryType,
      typedData.types,
    );

    // Verify the result matches the request?

    return this.#sign(typedData);
  }
}

function conditionTypedData(
  value: any,
  type: string,
  types: Record<string, ethers.TypedDataField[]>,
) {
  if (type === 'bytes' || type === 'bytes32' || type === 'address') {
    if (typeof value !== 'string') {
      return value;
    }
    if (value === '' || value === '0x') {
      return new Uint8Array();
    }
    return Buffer.from(value.replace(/^0x/, ''), 'hex');
  }

  if (!(type in types) || !value || typeof value !== 'object') {
    return value;
  }

  for (const field of types[type]) {
    if (!(field.name in value)) {
      continue;
    }
    if (field.type.endsWith('[]')) {
      const type = field.type.replace(/\[\]$/, '');
      value[field.name] = value[field.name].map((x) =>
        conditionTypedData(x, type, types),
      );
    } else {
      value[field.name] = conditionTypedData(
        value[field.name],
        field.type,
        types,
      );
    }
  }
  return value;
}

function hashMessage(message: Uint8Array | string) {
  if (typeof message === 'string') {
    message = Buffer.from(message);
  }
  var preamble = Buffer.from(`\x19Ethereum Signed Message:\n${message.length}`);
  var ethMessage = Buffer.concat([preamble, message]);
  return Buffer.from(keccak256(ethMessage));
}
