import { createHash } from "crypto";

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