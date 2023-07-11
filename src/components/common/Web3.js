import { createHash } from "crypto";

import { message } from "antd";

/* global BigInt */

export const truncateAddress = (address) => {
    if (!address) return "No Account";
    const match = address.match(
      /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/
    );
    if (!match) return address;
    return `${match[1]}…${match[2]}`;
};

export const ethToAccumulate = (address, type = "liteIdentity") => {
    if (!address) return "No Account";
    let pubKey = address.substring(2).toLowerCase();
    if (type === "publicKey") {
        return pubKey;
    }
    let checkSum = createHash('sha256').update(pubKey).digest("hex");
    let accumulate = "acc://" + pubKey + checkSum.substring(56);
    if (type === "liteTokenAccount") {
        accumulate += "/ACME";
    }
    return accumulate;
};

export const liteIdentityToLiteTokenAccount = (address) => {
    if (!address) return "No Account";
    return address + "/ACME";
};

export const txHash = async (tx) => {

    try {

        let headerBuffer = joinBuffers([
            Buffer.from([1], 'hex'),
            Buffer.from([tx.header.principal.length], 'hex'),
            Buffer.from(tx.header.principal),
            Buffer.from([2], 'hex'),
            Buffer.from(tx.header.initiator, 'hex'),
        ]);

        console.log("Tx.Header Bytes:", Buffer.from(headerBuffer).toString('hex'));

        let headerHash = await createHash('sha256').update(headerBuffer).digest('');
        console.log("Tx.Header Hash:", headerHash.toString('hex'));

        let bodyBuffer = joinBuffers([
            Buffer.from([1], 'hex'),
            Buffer.from([14], 'hex'),
            Buffer.from([2], 'hex'),
            Buffer.from([tx.body.recipient.length], 'hex'),
            Buffer.from(tx.body.recipient),
            Buffer.from([3], 'hex'),
            Buffer.from([Buffer.from(parseInt(tx.body.amount).toString(16), 'hex').length], 'hex'),
            Buffer.from(parseInt(tx.body.amount).toString(16), 'hex'),
            Buffer.from([4], 'hex'),
            Buffer.from(uvarintMarshalBinary(tx.body.oracle)),
        ]);

        console.log("Tx.Body Bytes:", Buffer.from(bodyBuffer).toString('hex'));

        let bodyHash = await createHash('sha256').update(bodyBuffer).digest('');
        console.log("Tx.Body Hash:", bodyHash.toString('hex'));

        let concatenatedHash = joinBuffers([
            Buffer.from(headerHash),
            Buffer.from(bodyHash),
        ]);

        console.log("Tx.HeaderHash+Tx.BodyHash:", Buffer.from(concatenatedHash).toString('hex'));
        
        let txHash = await createHash('sha256').update(concatenatedHash).digest('');

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

    }
    catch (error) {
        message.error(error.message);
    }

}

export const sigMdHash = async (sig) => {

    try {

        let sigBuffer = joinBuffers([
            Buffer.from([1], 'hex'),
            Buffer.from([10], 'hex'),
            Buffer.from([2], 'hex'),
            Buffer.from([Buffer.from(sig.publicKey, 'hex').length], 'hex'),
            Buffer.from(sig.publicKey, 'hex'),
            Buffer.from([4], 'hex'),
            Buffer.from([sig.signer.length], 'hex'),
            Buffer.from(sig.signer),
            Buffer.from([5], 'hex'),
            Buffer.from([1], 'hex'),
            Buffer.from([6], 'hex'),
            Buffer.from(uvarintMarshalBinary(sig.timestamp)),
        ]);

        console.log("Sig bytes:", Buffer.from(sigBuffer).toString('hex'));

        let sigMdHash = await createHash('sha256').update(sigBuffer).digest('');

        return sigMdHash;

    }
    catch (error) {
        message.error(error.message);
    }

}

export const rsvSigToDER = async (sig) => {

    try {

        sig = sig.split('x')[1];

        let sigBuffer = joinBuffers([
            Buffer.from("3044", 'hex'),
            Buffer.from("0220", 'hex'),
            Buffer.from(sig.substring(0, 64), 'hex'),
            Buffer.from("0220", 'hex'),
            Buffer.from(sig.substring(64, 128), 'hex')
        ]);

        console.log("DER sig:", Buffer.from(sigBuffer).toString('hex'));

        return sigBuffer;

    }
    catch (error) {
        message.error(error.message);
    }

}

export const joinBuffers = (buffers, delimiter = '') => {
    let d = Buffer.from(delimiter);
    return buffers.reduce((prev, b) => Buffer.concat([prev, d, b]));
}

export const uvarintMarshalBinary = (val, field) => {
    if (typeof val === "number" && val > Number.MAX_SAFE_INTEGER) {
      throw new Error(
        "Cannot marshal binary number greater than MAX_SAFE_INTEGER. Use bigint instead."
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
    const data = Uint8Array.from(buffer);
  
    return field ? fieldMarshalBinary(field, data) : data;
  }

export const fieldMarshalBinary = (field, val) => {
    if (field < 1 || field > 32) {
      throw new Error(`Field number is out of range [1, 32]: ${field}`);
    }
    return Buffer.concat([uvarintMarshalBinary(field), val]);
}