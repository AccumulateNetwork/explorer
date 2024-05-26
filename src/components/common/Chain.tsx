import { TxID, URL, URLArgs } from 'accumulate.js';
import {
  AccountRecord,
  ChainEntryRecord,
  JsonRpcClient,
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
import {
  Message,
  MessageType,
  SignatureMessage,
  TransactionMessage,
} from 'accumulate.js/lib/messaging';
import { List, Skeleton, Table, TableProps, Tag, Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiShieldCheckLine,
  RiTimerLine,
} from 'react-icons/ri';
import useAsyncEffect from 'use-async-effect';

import {
  CreditAmount,
  TokenAmount,
  recipientsOfTx,
  totalAmount,
} from './Amount';
import { Link } from './Link';
import TxTo from './TxTo';

type PendingRecord = MessageRecord<TransactionMessage>;
type ChainRecord = ChainEntryRecord<
  MessageRecord<TransactionMessage | SignatureMessage>
>;

const { Text, Paragraph } = Typography;
const client = new JsonRpcClient(`${import.meta.env.VITE_APP_API_PATH}/v3`);

export function Chain(props: {
  url: URLArgs;
  type: 'main' | 'scratch' | 'pending' | 'signature';
}) {
  const { type } = props;
  const url = URL.parse(props.url);

  const [txChain, setTxChain] = useState<PendingRecord[] | ChainRecord[]>(null);
  const [account, setAccount] = useState<
    TokenAccount | LiteTokenAccount | TokenIssuer | KeyPage | LiteIdentity
  >(null);
  const [issuer, setIssuer] = useState<TokenIssuer>(null);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
    total: null,
  });
  const [totalEntries, setTotalEntries] = useState(-1);

  useAsyncEffect(
    async (mounted) => {
      if (props.type !== 'main') {
        return;
      }

      const r = (await client.query(url)) as AccountRecord;
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

      const r2 = (await client.query(r.account.tokenUrl)) as AccountRecord;
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
            ? await client.query(url, {
                queryType: 'pending',
                range,
              })
            : ((await client.query(url, {
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
        setTableIsLoading(false);
      }
    },
    [props.url, pagination.current],
  );

  const columns: TableProps<ChainRecord>['columns'] = [
    {
      title: '#',
      className: 'no-break',
      render(row: ChainRecord) {
        return <Chain.Index entry={row} />;
      },
    },
    {
      title: 'Transaction ID',
      className: 'no-break',
      render(row: ChainRecord) {
        return <Chain.ID entry={row} />;
      },
    },
    {
      title: 'Type',
      className: 'no-break',
      render(tx: ChainRecord) {
        return <Chain.Type entry={tx} />;
      },
    },
  ];

  if (account) {
    columns.push({
      title: 'From',
      className: 'no-break',
      render(tx: ChainRecord) {
        return <Chain.TxnFrom account={account} entry={tx} />;
      },
    });
  }

  if (issuer) {
    columns.push({
      title: 'To',
      className: 'no-break',
      render(r: ChainRecord) {
        return <Chain.TxnTo entry={r} account={account} />;
      },
    });
  }

  if (account) {
    columns.push({
      title: 'Amount',
      className: 'no-break',
      align: 'right',
      render(r: ChainRecord) {
        return <Chain.TxnAmount entry={r} account={account} issuer={issuer} />;
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
        renderItem={(item) => (
          <List.Item>
            <Link to={item.id}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <Icon />
              </IconContext.Provider>
              {item.id.toString()}
            </Link>
          </List.Item>
        )}
        style={{ marginBottom: '30px' }}
      />
    );
  }

  return (
    <Table
      dataSource={txChain as ChainRecord[]}
      columns={columns}
      pagination={totalEntries > pagination.pageSize && pagination}
      rowKey="index"
      loading={tableIsLoading}
      scroll={{ x: 'max-content' }}
      expandable={{
        expandedRowRender: (r) => {
          if (r.value.message.type !== MessageType.Transaction) return null;
          const data = recipientsOfTx(r.value.message.transaction).map((x) =>
            x.asObject(),
          );
          return <TxTo data={data} token={issuer} />;
        },
        rowExpandable: (r) =>
          r.value.message.type === MessageType.Transaction &&
          recipientsOfTx(r.value.message.transaction).length > 1,
        expandRowByClick: true,
      }}
    />
  );
}

Chain.Index = function <R extends Record>({
  entry,
}: {
  entry: ChainEntryRecord<R>;
}) {
  return (
    <div>
      <Text>{entry.index}</Text>
    </div>
  );
};

Chain.ID = function <M extends Message>({
  entry,
}: {
  entry: ChainEntryRecord<MessageRecord<M>>;
}) {
  return (
    <Link to={entry.value.id}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        {entry.name == 'signature' ? <RiShieldCheckLine /> : <RiExchangeLine />}
      </IconContext.Provider>
      {Buffer.from(entry.entry).toString('hex')}
    </Link>
  );
};

Chain.Type = function <M extends Message>({
  entry,
}: {
  entry: ChainEntryRecord<MessageRecord<M>>;
}) {
  let type: string;
  switch (entry.value.message.type) {
    case MessageType.Transaction:
      type = TransactionType.getName(entry.value.message.transaction.body.type);
      break;
    case MessageType.Signature:
      type = SignatureType.getName(entry.value.message.signature.type);
      break;
    default:
      return null;
  }
  return <Tag color="green">{type}</Tag>;
};

Chain.TxnFrom = function <M extends Message>({
  entry,
  account,
}: {
  entry: ChainEntryRecord<MessageRecord<M>>;
  account: Account;
}) {
  if (entry.value.message.type !== MessageType.Transaction) return null;

  const tx = entry.value.message.transaction;
  let from: URL | TxID = tx.header.principal;
  switch (tx.body.type) {
    case TransactionType.SendTokens:
    case TransactionType.IssueTokens:
    case TransactionType.BurnTokens:
    case TransactionType.AddCredits:
    case TransactionType.TransferCredits:
      break;

    case TransactionType.SyntheticDepositTokens:
    case TransactionType.SyntheticDepositCredits:
      if (tx.body.isRefund) {
        return (
          <div>
            <Tag color="orange">refund</Tag>
            <Link to={tx.body.cause}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
              {Buffer.from(tx.body.cause.hash).toString('hex')}
            </Link>
          </div>
        );
      }

    // fallthrough
    case TransactionType.SyntheticBurnTokens:
      from = tx.body.source;
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

Chain.TxnTo = function <M extends Message>({
  entry,
  account,
}: {
  entry: ChainEntryRecord<MessageRecord<M>>;
  account: Account;
}) {
  if (entry.value.message.type !== MessageType.Transaction) return null;

  const tx = entry.value.message.transaction;
  const to = recipientsOfTx(tx);
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

Chain.TxnAmount = function <M extends Message>({
  entry,
  account,
  issuer,
}: {
  entry: ChainEntryRecord<MessageRecord<M>>;
  account: Account;
  issuer?: TokenIssuer;
}) {
  if (entry.value.message.type !== MessageType.Transaction) return null;

  const tx = entry.value.message.transaction;
  switch (tx.body.type) {
    case TransactionType.SendTokens:
    case TransactionType.IssueTokens: {
      return <TokenAmount issuer={issuer} {...amountFor(account, tx)} />;
    }

    case TransactionType.BurnTokens:
    case TransactionType.AddCredits:
      return <TokenAmount issuer={issuer} amount={tx.body.amount} debit />;

    case TransactionType.BurnCredits:
      return <CreditAmount amount={tx.body.amount} debit />;

    case TransactionType.TransferCredits:
      return <CreditAmount {...amountFor(account, tx)} />;

    case TransactionType.SyntheticDepositTokens:
    case TransactionType.SyntheticBurnTokens:
      return <TokenAmount issuer={issuer} amount={tx.body.amount} />;

    case TransactionType.SyntheticDepositCredits:
      return <CreditAmount amount={tx.body.amount} />;

    case TransactionType.BlockValidatorAnchor:
      return <TokenAmount issuer={issuer} amount={tx.body.acmeBurnt} />;

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
