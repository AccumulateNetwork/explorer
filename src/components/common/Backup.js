import { Address, PublicKeyHashAddress } from "accumulate.js";
import { SignatureType, Transaction } from "accumulate.js/lib/core";
import { Buffer } from "accumulate.js/lib/common";
import { createHash } from "crypto";

// Bug fix
const bufferFrom = Buffer.from
Buffer.from = function(...args) {
    if (args[0] === '') {
        return new Uint8Array([]);
    }
    return bufferFrom.apply(this, args);
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
    return `acc://${Buffer.from(v).toString('hex')}`
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
            type: "writeData",
            entry: {
                type: 'doubleHash',
                data: [ [], token ]
            }
        }
    })
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
    return sha256(...[
        await address.format(),
        'backup',
    ].map(x => Buffer.from(x, 'utf-8')));
}

/**
 * @param  {...Uint8Array} data
 * @returns {Uint8Array}
 */
async function sha256(...data) {
    const all = Buffer.concat(data);
    return await createHash('sha256').update(all).digest('');
}