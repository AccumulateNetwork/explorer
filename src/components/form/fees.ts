import {
  CreateIdentity,
  FeeSchedule,
  Transaction,
  TransactionType,
} from 'accumulate.js/lib/core';
import { encode } from 'accumulate.js/lib/encoding';

const generalTiny = 1;
const generalSmall = 10;
const generalMedium = 100;

const createIdentity = 50000;
const createDirectory = 10;
const createAccount = 2500;
const transferTokens = 300;
const createToken = 500000;
const createPage = 10000;
const updateAuth = 300;

export function calculateTransactionFee(
  txn: Transaction,
  schedule?: FeeSchedule,
) {
  let size = encode(txn).length;
  let oversize = Math.ceil(size / 256) - 1;
  if (size > 20 << 10) {
    throw new Error('Cannot submit transaction: too large');
  }

  switch (txn.body.type) {
    case TransactionType.CreateToken:
      return createToken + oversize * generalSmall;

    case TransactionType.CreateTokenAccount:
    case TransactionType.CreateDataAccount:
      return createAccount + oversize * generalSmall;

    case TransactionType.SendTokens:
    case TransactionType.IssueTokens:
    case TransactionType.CreateLiteTokenAccount: {
      let extra = 0;
      if ('to' in txn.body && txn.body.to) {
        extra = txn.body.to.length - 1;
      }
      return transferTokens + generalMedium * extra + oversize * generalSmall;
    }

    case TransactionType.CreateKeyBook:
    case TransactionType.CreateKeyPage: {
      let extra = 0;
      if ('keys' in txn.body && txn.body.keys) {
        extra = txn.body.keys.length - 1;
      }
      return createPage + generalMedium * extra + oversize * generalSmall;
    }

    case TransactionType.UpdateKey:
    case TransactionType.UpdateKeyPage:
    case TransactionType.UpdateAccountAuth: {
      let extra = 0;
      if ('operation' in txn.body && txn.body.operation) {
        extra = txn.body.operation.length - 1;
      } else if ('operations' in txn.body && txn.body.operations) {
        extra = txn.body.operations.length - 1;
      }
      return updateAuth + generalMedium * extra + oversize * generalSmall;
    }

    case TransactionType.BurnTokens:
    case TransactionType.LockAccount:
    case TransactionType.WriteDataTo:
      return generalSmall + oversize * generalSmall;

    case TransactionType.TransferCredits:
      return generalTiny + oversize * generalTiny;

    case TransactionType.AddCredits:
    case TransactionType.BurnCredits:
      return 0;

    case TransactionType.WriteData: {
      let fee =
        (oversize + 1) * (txn.body.scratch ? generalTiny : generalSmall);
      if (txn.body.writeToState) {
        fee *= 2;
      }
      return fee;
    }

    case TransactionType.CreateIdentity: {
      let fee = baseIdentityFee(txn.body, schedule);
      if (schedule?.bareIdentityDiscount > 0 && !txn.body.keyBookUrl) {
        fee -= schedule.bareIdentityDiscount;
        fee = Math.max(fee, createDirectory);
      }

      return fee + oversize * generalSmall;
    }

    default:
      return NaN;
  }
}

function baseIdentityFee(
  body: CreateIdentity,
  schedule: FeeSchedule | undefined,
) {
  if (!schedule || !body.url) {
    return createIdentity;
  }

  if (body.url.path != '' && body.url.path != '/') {
    if (schedule.createSubIdentity) {
      return schedule.createSubIdentity;
    }
    return createIdentity;
  }

  const name = body.url.authority.replace(/\.acme$/, '');
  if (name == body.url.authority || name == '') {
    return createIdentity;
  }

  return schedule.createIdentitySliding[name.length - 1] || createIdentity;
}
