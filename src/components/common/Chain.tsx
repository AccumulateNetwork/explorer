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
import {
  List,
  Skeleton,
  Spin,
  Table,
  TablePaginationConfig,
  TableProps,
  Tag,
  Typography,
} from 'antd';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiShieldCheckLine,
  RiTimerLine,
} from 'react-icons/ri';

import {
  CreditAmount,
  TokenAmount,
  recipientsOfTx,
  totalAmount,
} from './Amount';
import { Link } from './Link';
import { Shared } from './Shared';
import TxTo from './TxTo';
import { useAsyncEffect } from './useAsync';

type PendingRecord = MessageRecord<TransactionMessage> | ErrorRecord;
type ChainRecord =
  | ChainEntryRecord<MessageRecord>
  | ChainEntryRecord<ErrorRecord>;

const { Text } = Typography;

export function Chain(props: {
  url: URLArgs;
  type: 'main' | 'scratch' | 'pending' | 'signature';
}) {
  const { type } = props;
  const url = URL.parse(props.url);

  const { api } = useContext(Shared);
  if (!api) return <Spin />;

  const [txChain, setTxChain] = useState<PendingRecord[] | ChainRecord[]>(null);
  const [account, setAccount] = useState<
    TokenAccount | LiteTokenAccount | TokenIssuer | KeyPage | LiteIdentity
  >(null);
  const [issuer, setIssuer] = useState<TokenIssuer>(null);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 10,
    showSizeChanger: true,
    hideOnSinglePage: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
  });
  const [totalEntries, setTotalEntries] = useState(-1);

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
    [props.url],
  );

  useAsyncEffect(
    async (mounted) => {
      setTableIsLoading(true);
      try {
        const range: RangeOptionsArgs & { expand: true } = {
          start: (pagination.current - 1) * pagination.pageSize,
          count: pagination.pageSize,
          expand: true,
        };
        const response =
          type === 'pending'
            ? await api.query(url, {
                queryType: 'pending',
                range,
              })
            : ((await api.query(url, {
                queryType: 'chain',
                name: type,
                range: { ...range, fromEnd: true },
              })) as RecordRange<ChainRecord>);

        if (!mounted()) return;

        setTxChain((response.records || []).reverse());
        setPagination({
          ...pagination,
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: response.total,
        });
        setTotalEntries(response.total);
      } finally {
        if (!mounted()) return;
        setTableIsLoading(false);
      }
    },
    [props.url, pagination.current],
  );

  const columns: TableProps<ChainRecord>['columns'] = [
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
          return (
            <Text type="secondary">{Buffer.from(entry).toString('hex')}</Text>
          );
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
  ];

  if (account) {
    columns.push({
      title: 'From',
      className: 'no-break',
      render({ value }: ChainRecord) {
        if (value instanceof ErrorRecord) return null;
        if (value.message.type !== MessageType.Transaction) return null;
        return (
          <Chain.TxnFrom account={account} txn={value.message.transaction} />
        );
      },
    });
  }

  if (issuer) {
    columns.push({
      title: 'To',
      className: 'no-break',
      render({ value }: ChainRecord) {
        if (value instanceof ErrorRecord) return null;
        if (value.message.type !== MessageType.Transaction) return null;
        return (
          <Chain.TxnTo account={account} txn={value.message.transaction} />
        );
      },
    });
  }

  if (account) {
    columns.push({
      title: 'Amount',
      className: 'no-break',
      align: 'right',
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
    });
  }

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

  if (!txChain) {
    return (
      <div className="skeleton-holder">
        <Skeleton active />
      </div>
    );
  }

  if (type === 'pending') {
    return (
      <List
        size="small"
        bordered
        dataSource={txChain as PendingRecord[]}
        renderItem={(item) => {
          if (item instanceof ErrorRecord) {
            return <Text style={{ color: 'red' }}>{item.value.message}</Text>;
          }
          return (
            <List.Item>
              <Link to={item.id}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <Icon />
                </IconContext.Provider>
                {item.id.toString()}
              </Link>
            </List.Item>
          );
        }}
        style={{ marginBottom: '30px' }}
      />
    );
  }

  return (
    <Table
      dataSource={txChain as ChainRecord[]}
      columns={columns}
      pagination={pagination}
      onChange={(p) => setPagination(p)}
      rowKey="index"
      loading={tableIsLoading}
      scroll={{ x: 'max-content' }}
      expandable={{
        expandedRowRender: ({ value }) => {
          if (value instanceof ErrorRecord) return null;
          if (value.message.type !== MessageType.Transaction) return null;
          const data = recipientsOfTx(value.message.transaction).map((x) =>
            x.asObject(),
          );
          return <TxTo data={data} token={issuer} />;
        },
        rowExpandable: ({ value }) => {
          if (value instanceof ErrorRecord) return null;
          if (value.message.type !== MessageType.Transaction) return null;
          return (
            value.message.type === MessageType.Transaction &&
            recipientsOfTx(value.message.transaction)?.length > 1
          );
        },
        expandRowByClick: true,
      }}
    />
  );
}

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
      {Buffer.from(entry).toString('hex')}
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
    case TransactionType.SyntheticDepositCredits:
      if (txn.body.isRefund) {
        return (
          <div>
            <Tag color="orange">refund</Tag>
            <Link to={txn.body.cause}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
              {Buffer.from(txn.body.cause.hash).toString('hex')}
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
  const amount = totalAmount(to, (x) => debit || x.url.equals(account.url));
  return { amount, debit };
}
