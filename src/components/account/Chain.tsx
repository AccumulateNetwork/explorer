import { Skeleton, Tag, Typography } from 'antd';
import { ColumnType } from 'antd/lib/table';
import moment from 'moment-timezone';
import React, { useContext, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiShieldCheckLine,
  RiTimerLine,
} from 'react-icons/ri';

import { TxID, URL, URLArgs } from 'accumulate.js';
import {
  AccountRecord,
  ChainEntryRecord,
  ErrorRecord,
  MessageRecord,
  RangeOptionsArgs,
  Record,
  RecordRange,
} from 'accumulate.js/lib/api_v3';
import {
  Account,
  AccountType,
  KeyPage,
  LiteIdentity,
  LiteTokenAccount,
  SignatureType,
  TokenAccount,
  TokenIssuer,
  Transaction,
  TransactionType,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';
import {
  Message,
  MessageType,
  TransactionMessage,
} from 'accumulate.js/lib/messaging';

import { ManagedRange } from '../../utils/ManagedRange';
import { extractTxType } from '../../utils/message';
import {
  CreditAmount,
  TokenAmount,
  recipientsOfTx,
  totalAmount,
} from '../common/Amount';
import { InfiniteList, InfiniteTable } from '../common/InfiniteList';
import { Link } from '../common/Link';
import { Network } from '../common/Network';
import { useAsyncEffect } from '../common/useAsync';

type PendingRecord = MessageRecord<TransactionMessage> | ErrorRecord;
type ChainRecord =
  | ChainEntryRecord<MessageRecord>
  | ChainEntryRecord<ErrorRecord>;

interface EnrichedRow {
  type?: string;
  timestamp?: string;
  adi?: string;
  path?: string;
}

const { Text } = Typography;

const CURSOR_PARAMS = {
  pending: 'pending_start',
  main: 'main_start',
  scratch: 'scratch_start',
  signature: 'signature_start',
} as const;

function shortHash(entry: Uint8Array | undefined): string {
  if (!entry || !entry.length) return 'unknown';
  return Buffer.from(entry).toString('hex').slice(0, 8);
}

function splitAccount(u: URL | undefined): { adi?: string; path?: string } {
  if (!u) return {};
  const s = u.toString().replace(/^acc:\/\//, '');
  const [adi, ...rest] = s.split('/');
  return { adi, path: rest.join('/') };
}

function formatTime(t: Date | string | undefined): string | undefined {
  if (!t) return undefined;
  return moment(t).format('HH:mm:ss');
}

export function Chain(props: {
  url: URLArgs;
  type: 'main' | 'scratch' | 'pending' | 'signature';
}) {
  const { type } = props;
  const url = URL.parse(props.url);

  const { api, network } = useContext(Network);
  const [managed] = useState(
    props.type === 'pending'
      ? new ManagedRange((range) =>
          api.query(url, {
            queryType: 'pending',
            range: {
              expand: true,
              ...range,
            } as RangeOptionsArgs & { expand: true },
          }),
        )
      : new ManagedRange(
          (range) =>
            api.query(url, {
              queryType: 'chain',
              name: props.type,
              range: {
                expand: true,
                ...range,
              },
            }) as Promise<RecordRange<ChainRecord>>,
          true,
        ),
  );

  const [total, setTotal] = useState<number | null>(null);
  const [account, setAccount] = useState<
    TokenAccount | LiteTokenAccount | TokenIssuer | KeyPage | LiteIdentity
  >(null);
  const [issuer, setIssuer] = useState<TokenIssuer>(null);

  useAsyncEffect(
    async (mounted) => {
      if (props.type !== 'main' && props.type !== 'scratch') {
        return;
      }

      const r = (await api.query(url)) as AccountRecord;
      if (!mounted()) return;
      switch (r.account.type) {
        case AccountType.TokenAccount:
        case AccountType.LiteTokenAccount:
          setAccount(r.account);
          break;
        case AccountType.TokenIssuer:
          setAccount(r.account);
          setIssuer(r.account);
          return;
        case AccountType.KeyPage:
        case AccountType.LiteIdentity:
          setAccount(r.account);
          return;
        default:
          return;
      }

      const r2 = (await api.query(r.account.tokenUrl)) as AccountRecord;
      if (!mounted()) return;
      if (r2.account.type === AccountType.TokenIssuer) {
        setIssuer(r2.account);
      }
    },
    [props.url.toString(), network.id],
  );

  // Prime the total so InfiniteList/Table can decide short vs windowed.
  // Uses a 1-element fetch; the component will drive the real pages.
  useAsyncEffect(
    async (mounted) => {
      const resp = await managed.getPage({ current: 1, pageSize: 1 });
      if (!mounted()) return;
      setTotal(resp.total ?? 0);
    },
    [props.url.toString(), props.type, network.id],
  );

  const pageSize = 25;

  const loadPage = async <T,>(start: number, count: number): Promise<T[]> => {
    const current = Math.floor(start / count) + 1;
    const resp = await managed.getPage({ current, pageSize: count });
    // Preserve the existing reverse-ordering from the prior implementation.
    return ((resp.records as unknown as T[]) || []).slice().reverse();
  };

  const enrichChainPage = async (
    items: ChainRecord[],
  ): Promise<ReadonlyMap<ChainRecord, EnrichedRow>> => {
    const map = new Map<ChainRecord, EnrichedRow>();
    for (const item of items) {
      if (item.value instanceof ErrorRecord) continue;
      const value = item.value as MessageRecord | undefined;
      const { adi, path } = splitAccount(item.account);
      map.set(item, {
        type: extractTxType(value),
        timestamp: formatTime(value?.lastBlockTime ?? item.lastBlockTime),
        adi,
        path,
      });
    }
    return map;
  };

  const enrichPendingPage = async (
    items: PendingRecord[],
  ): Promise<ReadonlyMap<PendingRecord, EnrichedRow>> => {
    const map = new Map<PendingRecord, EnrichedRow>();
    for (const item of items) {
      if (item instanceof ErrorRecord) continue;
      const u = item.id ? URL.parse(item.id.toString()) : undefined;
      const { adi, path } = splitAccount(u);
      map.set(item, {
        type: extractTxType(item),
        timestamp: formatTime(item.lastBlockTime),
        adi,
        path,
      });
    }
    return map;
  };

  const columns: (ColumnType<ChainRecord> & { hidden?: boolean })[] = [
    {
      title: '#',
      className: 'no-break',
      render(r: ChainRecord) {
        return <Chain.Index entry={r} />;
      },
    },
    {
      title: 'ID',
      className: 'no-break',
      render({ value, entry }: ChainRecord) {
        if (value instanceof ErrorRecord) {
          return <Text type="secondary">{shortHash(entry)}</Text>;
        }
        return <Chain.ID record={value} entry={entry} />;
      },
    },
    {
      title: 'Type',
      className: 'no-break',
      render({ value }: ChainRecord) {
        if (value instanceof ErrorRecord) {
          return <Tag color="red">{Status.getName(value.value.code)}</Tag>;
        }
        return <Chain.Type message={value.message} />;
      },
    },

    {
      title: 'From',
      className: 'no-break',
      hidden: !account,
      render({ value }: ChainRecord) {
        if (value instanceof ErrorRecord) return null;
        if (value.message.type !== MessageType.Transaction) return null;
        return (
          <Chain.TxnFrom account={account} txn={value.message.transaction} />
        );
      },
    },
    {
      title: 'To',
      className: 'no-break',
      hidden: !account || account.type === AccountType.LiteIdentity,
      render({ value }: ChainRecord) {
        if (value instanceof ErrorRecord) return null;
        if (value.message.type !== MessageType.Transaction) return null;
        return (
          <Chain.TxnTo account={account} txn={value.message.transaction} />
        );
      },
    },
    {
      title: 'Amount',
      className: 'no-break',
      align: 'right',
      hidden: !account,
      render({ value }: ChainRecord) {
        if (value instanceof ErrorRecord) return null;
        if (value.message.type !== MessageType.Transaction) return null;
        return (
          <Chain.TxnAmount
            account={account}
            issuer={issuer}
            txn={value.message.transaction}
          />
        );
      },
    },
  ];

  const visibleColumns = useMemo(
    () => columns.filter((x) => !x.hidden),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, issuer],
  );

  function Icon() {
    switch (type) {
      case 'pending':
        return <RiTimerLine />;
      case 'signature':
        return <RiShieldCheckLine />;
      default:
        return <RiExchangeLine />;
    }
  }

  if (total === null) {
    return (
      <div className="skeleton-holder">
        <Skeleton active />
      </div>
    );
  }

  if (type === 'pending') {
    return (
      <InfiniteList<PendingRecord>
        total={total}
        loadPage={(s, c) => loadPage<PendingRecord>(s, c)}
        enrichPage={
          enrichPendingPage as (
            items: PendingRecord[],
          ) => Promise<ReadonlyMap<unknown, unknown>>
        }
        rowKey={(item, i) =>
          item instanceof ErrorRecord
            ? `e-${i}`
            : item.id?.toString() || `i-${i}`
        }
        cursorParam={CURSOR_PARAMS.pending}
        cursorOf={() => undefined}
        pageSize={pageSize}
        renderItem={(item) => <Chain.PendingRow item={item} icon={<Icon />} />}
      />
    );
  }

  return (
    <InfiniteTable<ChainRecord>
      className={`chain-table chain-table-${type}`}
      total={total}
      loadPage={(s, c) => loadPage<ChainRecord>(s, c)}
      columns={visibleColumns}
      rowKey="index"
      enrichPage={
        enrichChainPage as (
          items: ChainRecord[],
        ) => Promise<ReadonlyMap<unknown, unknown>>
      }
      pageSize={pageSize}
    />
  );
}

Chain.PendingRow = function ({
  item,
  icon,
}: {
  item: PendingRecord;
  icon: React.ReactNode;
}) {
  if (item instanceof ErrorRecord) {
    return <Text style={{ color: 'red' }}>{item.value.message}</Text>;
  }

  const hash = item.id ? Buffer.from(item.id.hash).toString('hex') : '';
  const short = hash ? hash.slice(0, 8) : 'unknown';
  const u = item.id ? URL.parse(item.id.toString()) : undefined;
  const { adi, path } = splitAccount(u);
  const type = extractTxType(item);
  const timestamp = formatTime(item.lastBlockTime);

  const pathSuffix = path ? `/${path}` : '';
  const label = type
    ? `${type} · ${adi ?? 'unknown'}${pathSuffix}${timestamp ? ` @ ${timestamp}` : ''}`
    : `${short} · unknown`;

  return (
    <Link to={item.id}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        {icon}
      </IconContext.Provider>
      {label}
    </Link>
  );
};

Chain.Index = function ({ entry }: { entry: ChainEntryRecord<Record> }) {
  return (
    <div>
      <Text>{entry.index}</Text>
    </div>
  );
};

Chain.ID = function ({
  record,
  entry,
}: {
  record: MessageRecord;
  entry: Uint8Array;
}) {
  const Icon =
    record.message.type === MessageType.Signature
      ? RiShieldCheckLine
      : RiExchangeLine;
  return (
    <Link to={record.id}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <Icon />
      </IconContext.Provider>
      {shortHash(entry)}
    </Link>
  );
};

Chain.Type = function ({ message }: { message: Message }) {
  let type: string;
  switch (message.type) {
    case MessageType.Transaction:
      type = TransactionType.getName(message.transaction.body.type);
      break;
    case MessageType.Signature:
      type = SignatureType.getName(message.signature.type);
      break;
    default:
      type = MessageType.getName(message.type);
      break;
  }
  return <Tag color="green">{type}</Tag>;
};

Chain.TxnFrom = function ({
  txn,
  account,
}: {
  txn: Transaction;
  account: Account;
}) {
  let from: URL | TxID = txn.header.principal;
  switch (txn.body.type) {
    case TransactionType.SendTokens:
    case TransactionType.IssueTokens:
    case TransactionType.BurnTokens:
    case TransactionType.AddCredits:
    case TransactionType.TransferCredits:
      break;

    case TransactionType.SyntheticDepositTokens:
      if (account.type === AccountType.LiteIdentity) {
        return null;
      }
    case TransactionType.SyntheticDepositCredits:
      if (txn.body.isRefund) {
        return (
          <div>
            <Tag color="orange">refund</Tag>
            <Link to={txn.body.cause}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
              {shortHash(txn.body.cause.hash)}
            </Link>
          </div>
        );
      }

    // fallthrough
    case TransactionType.SyntheticBurnTokens:
      from = txn.body.source;
      break;

    default:
      return null;
  }

  if (!from) {
    return null;
  }

  if (from.equals(account.url)) {
    return <Text type="secondary">{from.toString()}</Text>;
  }

  return (
    <Link to={from}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiAccountCircleLine />
      </IconContext.Provider>
      {from.toString()}
    </Link>
  );
};

Chain.TxnTo = function ({
  txn,
  account,
}: {
  txn: Transaction;
  account: Account;
}) {
  switch (txn.body.type) {
    case TransactionType.SyntheticDepositCredits:
      return null;
    case TransactionType.SyntheticDepositTokens:
      if (account.type === AccountType.LiteIdentity) {
        return null;
      }
      break;
  }

  const to = recipientsOfTx(txn);
  if (!to) return null;

  if (to.length !== 1) {
    return <Text type="secondary">{to.length} recipients</Text>;
  }

  if (to[0].url.equals(account.url)) {
    return <Text type="secondary">{account.url.toString()}</Text>;
  }

  return (
    <Link key={to[0].url.toString()} to={to[0].url}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiAccountCircleLine />
      </IconContext.Provider>
      {to[0].url.toString()}
    </Link>
  );
};

Chain.TxnAmount = function ({
  txn,
  account,
  issuer,
}: {
  txn: Transaction;
  account: Account;
  issuer?: TokenIssuer;
}) {
  switch (txn.body.type) {
    case TransactionType.SendTokens:
    case TransactionType.IssueTokens: {
      return <TokenAmount issuer={issuer} {...amountFor(account, txn)} />;
    }

    case TransactionType.BurnTokens:
    case TransactionType.AddCredits:
      return <TokenAmount issuer={issuer} amount={txn.body.amount} debit />;

    case TransactionType.BurnCredits:
      return <CreditAmount amount={txn.body.amount} debit />;

    case TransactionType.TransferCredits:
      return <CreditAmount {...amountFor(account, txn)} />;

    case TransactionType.SyntheticDepositTokens:
      if (account.type === AccountType.LiteIdentity) {
        return null;
      }
    case TransactionType.SyntheticBurnTokens:
      return <TokenAmount issuer={issuer} amount={txn.body.amount} />;

    case TransactionType.SyntheticDepositCredits:
      return <CreditAmount amount={txn.body.amount} />;

    case TransactionType.BlockValidatorAnchor:
      return <TokenAmount issuer={issuer} amount={txn.body.acmeBurnt} />;

    default:
      return null;
  }
};

function amountFor(account: Account, tx: Transaction) {
  const debit = account.url.equals(tx.header.principal);
  const to = recipientsOfTx(tx);
  const amount = totalAmount(to, (x) => {
    if (!debit) {
      return x.url.equals(account.url);
    }
    if (tx.body.type !== TransactionType.TransferCredits) {
      return true;
    }
    return !x.url.equals(account.url);
  });
  return { amount, debit };
}
