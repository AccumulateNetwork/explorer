import { URL, URLArgs } from 'accumulate.js';
import {
  JsonRpcClient,
  RecordRange,
  RecordType,
  UrlRecord,
} from 'accumulate.js/lib/api_v3';
import {
  Account,
  AccountArgs,
  AccountType,
  KeyBook,
  KeyBookArgs,
  KeyPage,
  KeyPageArgs,
  LiteIdentity,
  LiteIdentityArgs,
  LiteTokenAccount,
  LiteTokenAccountArgsWithType,
  TokenAccount,
  TokenAccountArgsWithType,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { AnyTokenAccount, hydrate, isRecordOf } from '../../utils/types';
import { isErrorRecord } from '../common/query';
import { Store } from './Store';

interface LinkedBookArgs {
  book: KeyBookArgs;
  pages: KeyPageArgs[];
}

class LinkedBook {
  readonly book: KeyBook;
  readonly pages: KeyPage[];

  constructor({ book, pages }: LinkedBookArgs) {
    this.book = hydrate(book, KeyBook);
    this.pages = hydrate(pages, KeyPage);
  }

  asObject(): LinkedBookArgs {
    return {
      book: this.book.asObject(),
      pages: this.pages.map((page) => page.asObject()),
    };
  }
}

interface LinkedArgs {
  direct: AccountArgs[];
  all: AccountArgs[];
  books: LinkedBookArgs[];
  liteIDs: LiteIdentityArgs[];
  tokens: (TokenAccountArgsWithType | LiteTokenAccountArgsWithType)[];
}

export class Linked {
  readonly direct: Account[];
  readonly all: Account[];
  readonly books: LinkedBook[];
  readonly liteIDs: LiteIdentity[];
  readonly tokens: (TokenAccount | LiteTokenAccount)[];

  constructor(args: LinkedArgs) {
    this.direct = hydrate(args.direct, Account);
    this.all = hydrate(args.all, Account);
    this.books = hydrate(args.books, LinkedBook);
    this.liteIDs = hydrate(args.liteIDs, LiteIdentity);
    this.tokens = hydrate(args.tokens, AnyTokenAccount);
  }

  asObject(): LinkedArgs {
    return {
      direct: this.direct.map((x) => x.asObject()),
      all: this.all.map((x) => x.asObject()),
      books: this.books.map((x) => x.asObject()),
      liteIDs: this.liteIDs.map((x) => x.asObject()),
      tokens: this.tokens.map((x) => x.asObject()),
    };
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

    const l = new Loader(api, urls);
    return await l.load();
  }
}

class Loader {
  readonly api: JsonRpcClient;
  readonly seen = new Set<string>();
  readonly urls: Set<string>;

  constructor(api: JsonRpcClient, urls: Set<string>) {
    this.api = api;
    this.urls = urls;
  }

  readonly #values: LinkedArgs = {
    direct: [],
    all: [],
    liteIDs: [],
    books: [],
    tokens: [],
  };

  async load() {
    await Promise.all([...this.urls].map((u) => this.#load(u, true)));
    return new Linked(this.#values);
  }

  async #load(url: URLArgs, direct = false) {
    // Only visit each account once
    url = URL.parse(url);
    const s = url.toString().toLowerCase();
    if (this.seen.has(s)) {
      return;
    }
    this.seen.add(s);

    const r = await this.api.query(url).catch(isErrorRecord);
    if (isRecordOf(r, Status.NotFound)) {
      return;
    }
    if (r.recordType === RecordType.Error) {
      throw r.value;
    }
    if (r.recordType !== RecordType.Account) {
      return;
    }
    if (direct) {
      this.#values.direct.push(r.account);
    }

    this.#values.all.push(r.account);
    switch (r.account.type) {
      case AccountType.Identity:
        await this.#directory(url, r.directory);
        break;

      case AccountType.LiteIdentity:
        this.#values.liteIDs.push(r.account);
        await this.#directory(url, r.directory);
        break;

      case AccountType.KeyBook: {
        const pages = await this.#pages(r.account);
        this.#values.books.push(new LinkedBook({ book: r.account, pages }));
        break;
      }

      case AccountType.TokenAccount:
      case AccountType.LiteTokenAccount:
        this.#values.tokens.push(r.account);
        break;
    }
    return r.account;
  }

  async #directory(scope: URLArgs, r: RecordRange<UrlRecord>) {
    if (!r) {
      r = await this.api.query(scope, { queryType: 'directory', range: {} });
    }
    while (r?.records?.length > 0) {
      await Promise.all(r.records.map((r) => this.#load(r.value)));
      let { start } = r;
      start += r.records.length;
      if (start >= r.total) {
        break;
      }
      r = await this.api.query(scope, {
        queryType: 'directory',
        range: { start },
      });
    }
  }

  async #pages(book: KeyBook) {
    return Promise.all(
      [...Array(book.pageCount).keys()]
        .map((_, i) => `${book.url}/${i + 1}`)
        .map((u) => this.#load(u)),
    ).then((x) => x.filter((y): y is KeyPage => y instanceof KeyPage));
  }
}
