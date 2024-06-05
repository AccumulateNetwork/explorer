import { URL, URLArgs } from 'accumulate.js';
import {
  AccountRecord,
  JsonRpcClient,
  RecordRange,
  RecordType,
  UrlRecord,
} from 'accumulate.js/lib/api_v3';
import {
  AccountType,
  KeyBook,
  KeyPage,
  LiteIdentity,
  LiteTokenAccount,
  TokenAccount,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { isRecordOf } from '../../utils/types';
import { fetchAccount, isErrorRecord } from '../common/query';
import { Store } from './Store';

interface LinkedBook {
  readonly book: KeyBook;
  readonly pages: KeyPage[];
}

export class Linked {
  readonly urls: string[];
  readonly books: LinkedBook[];
  readonly liteIDs: LiteIdentity[];
  readonly tokens: (TokenAccount | LiteTokenAccount)[];

  private constructor(props: Required<Linked>) {
    Object.assign(this, props);
  }

  static async load(api: JsonRpcClient, entries: Store.Entry[]) {
    const urls = new Set<string>();
    for (const entry of entries) {
      try {
        switch (entry.type) {
          case 'link':
            urls.add(URL.parse(entry.url).toString().toLowerCase());
            break;
          case 'unlink':
            urls.delete(URL.parse(entry.url).toString().toLowerCase());
            break;
        }
      } catch (_) {}
    }

    const context: Required<Linked> = {
      urls: [...urls],
      liteIDs: [],
      books: [],
      tokens: [],
    };

    await Promise.all([...urls].map((u) => load(api, context, u)));

    return new this(context);
  }
}

async function load(
  api: JsonRpcClient,
  context: Required<Linked>,
  url: URLArgs,
) {
  const r = await api.query(url).catch(isErrorRecord);
  if (isRecordOf(r, Status.NotFound)) {
    return;
  }
  if (r.recordType === RecordType.Error) {
    throw r.value;
  }
  if (r.recordType !== RecordType.Account) {
    return;
  }

  switch (r.account.type) {
    case AccountType.Identity:
      await loadDirectory(api, context, url, r.directory);
      break;

    case AccountType.LiteIdentity:
      context.liteIDs.push(r.account);
      await loadDirectory(api, context, url, r.directory);
      break;

    case AccountType.KeyBook: {
      const pages = await loadPages(api, r.account);
      context.books.push({ book: r.account, pages });
      break;
    }

    case AccountType.TokenAccount:
    case AccountType.LiteTokenAccount:
      context.tokens.push(r.account);
      break;
  }
}

async function loadPages(api: JsonRpcClient, book: KeyBook) {
  return await Promise.all(
    [...Array(book.pageCount).keys()].map(async (_, i) => {
      const r = await api.query(`${book.url}/${i + 1}`);
      if (!isRecordOf(r, KeyPage)) {
        return;
      }
      return r.account;
    }),
  );
}

async function loadDirectory(
  api: JsonRpcClient,
  context: Required<Linked>,
  scope: URLArgs,
  r: RecordRange<UrlRecord>,
) {
  if (!r) {
    r = await api.query(scope, { queryType: 'directory', range: {} });
  }
  while (r?.records?.length > 0) {
    await Promise.all(r.records.map((r) => load(api, context, r.value)));
    let { start } = r;
    start += r.records.length;
    if (start >= r.total) {
      break;
    }
    r = await api.query(scope, { queryType: 'directory', range: { start } });
  }
}
