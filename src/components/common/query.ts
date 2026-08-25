import { TxID, URLArgs, core, errors } from 'accumulate.js';
import {
  ErrorRecord,
  JsonRpcClient,
  MessageRecord,
  RecordRange,
  RecordType,
  RpcError,
} from 'accumulate.js/lib/api_v3';
import { Account, DataEntry } from 'accumulate.js/lib/core';
import { Error as Error2, Status } from 'accumulate.js/lib/errors';
import { EnvelopeArgs } from 'accumulate.js/lib/messaging';

import {
  Ctor,
  TxnEntry,
  isRecordOf,
  isRecordOfDataTxn,
} from '../../utils/types';

export function isErrorRecord(error: any) {
  try {
    if (
      typeof error === 'object' &&
      'data' in error &&
      typeof error.data === 'object'
    ) {
      return new ErrorRecord({ value: new errors.Error(error.data) });
    }
  } catch (_) {}
  throw error;
}

const waitTime = 500;
const waitLimit = 30_000 / waitTime;

export async function submitAndWait(api: JsonRpcClient, env: EnvelopeArgs) {
  const results = await api.submit(env);
  const error = results.filter((x) => !x.success).map((x) => x.message);
  if (error.length) {
    throw new Error(error.join('\n'));
  }

  await waitForEach(
    api,
    results.map((r) => r.status.txID),
  );
}

async function waitFor(api: JsonRpcClient, txid: TxID | URLArgs) {
  const r = await waitForSingle(api, txid);
  await waitForEach(api, r.produced?.records?.map((r) => r.value) || []);
  return r;
}

async function waitForEach(api: JsonRpcClient, txids: TxID[]) {
  await Promise.all(txids.map((id) => id && waitFor(api, id)));
}

async function waitForSingle(api: JsonRpcClient, txid: TxID | URLArgs) {
  console.log(`Waiting for ${txid}`);
  for (let i = 0; i < waitLimit; i++) {
    try {
      const r = (await api.query(txid)) as MessageRecord;
      if (r.status === Status.Delivered) {
        return r;
      }

      // Status is pending or unknown
      await new Promise((r) => setTimeout(r, waitTime));
      continue;
    } catch (error) {
      const err2 = isClientError(error);
      if (err2.code === Status.NotFound) {
        // Not found
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      throw new Error(`Transaction failed: ${err2.message}`);
    }
  }

  throw new Error(
    `Transaction still missing or pending after ${(waitTime * waitLimit) / 1000} seconds`,
  );
}

export function isClientError(error: any) {
  if (!(error instanceof RpcError)) throw error;
  if (error.code > -33000) throw error;

  let err2;
  try {
    err2 = new Error2(error.data);
  } catch (_) {
    throw error;
  }
  if (err2.code && err2.code >= 500) {
    throw err2;
  }
  return err2;
}

export async function fetchAccount<
  C extends Ctor<core.Account>,
  A extends Account = InstanceType<C>,
>(api: JsonRpcClient, url: URLArgs, type?: C): Promise<A | null> {
  const r = await api.query(url).catch(isErrorRecord);
  if (isRecordOf(r, Status.NotFound)) {
    // Account does not exist
    return null;
  }

  if (r.recordType === RecordType.Account && (!type || isRecordOf(r, type))) {
    // Account exists and is the specified type
    return r.account as A;
  }

  if (r.recordType === RecordType.Error) {
    // Some other error occurred
    throw new Error(r.value.message);
  }

  // Unknown error
  throw new Error(`An unexpected error occurred while retrieving ${url}`);
}

export async function fetchDataEntries(
  api: JsonRpcClient,
  scope: URLArgs,
  predicate?: (_: DataEntry) => boolean,
) {
  const results: DataEntry[] = [];
  for (let start = 0; ; ) {
    const { records = [], total = 0 } = (await api.query(scope, {
      queryType: 'chain',
      name: 'main',
      range: {
        start,
        expand: true,
      },
    })) as RecordRange<TxnEntry>;

    for (const r of records) {
      if (!isRecordOfDataTxn(r)) {
        continue;
      }
      const { entry } = r.value.message.transaction.body;
      if (!predicate || predicate(entry)) {
        results.push(entry);
      }
    }
    start += records.length;
    if (start >= total) {
      break;
    }
  }
  return results;
}
