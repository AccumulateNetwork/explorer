import { URL, URLArgs } from 'accumulate.js';
import { AccountRecord, JsonRpcClient } from 'accumulate.js/lib/api_v3';
import { AccountType, TokenAccount, TokenIssuer } from 'accumulate.js/lib/core';
import {
  Descriptions,
  List,
  Skeleton,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiShieldCheckLine,
  RiTimerLine,
} from 'react-icons/ri';
import useAsyncEffect from 'use-async-effect';

import { Link } from './Link';
import RPC from './RPC';
import { tokenAmount, tokenAmountToLocaleString } from './TokenAmount';

const { Text, Paragraph } = Typography;
const client = new JsonRpcClient(`${import.meta.env.VITE_APP_API_PATH}/v3`);

export function Chain(props: {
  url: URLArgs;
  type: 'main' | 'scratch' | 'pending' | 'signature';
}) {
  const { type } = props;
  const url = URL.parse(props.url);

  const [txChain, setTxChain] = useState(null);
  const [account, setAccount] = useState(null);
  const [issuer, setIssuer] = useState(null);
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
      let start = 0;

      const params = pagination;
      if (params) {
        start = (params.current - 1) * params.pageSize;
      }

      try {
        let response;
        if (type === 'pending')
          response = await RPC.request(
            'query',
            {
              scope: url.toString(),
              query: {
                queryType: 'pending',
                range: {
                  start,
                  count: params.pageSize,
                  expand: true,
                },
              },
            },
            'v3',
          );
        else
          response = await RPC.request(
            'query',
            {
              scope: url.toString(),
              query: {
                queryType: 'chain',
                name: type,
                range: {
                  fromEnd: true,
                  expand: true,
                  count: params.pageSize,
                  start,
                },
              },
            },
            'v3',
          );

        if (!mounted()) return;
        if (response) {
          // workaround API bug response
          if (response.start === null || response.start === undefined) {
            response.start = 0;
          }
          setTxChain((response.records || []).reverse());
          setPagination({
            ...pagination,
            current: params.current,
            pageSize: params.pageSize,
            total: response.total,
          });
          setTotalEntries(response.total);
        } else {
          throw new Error('Chain not found');
        }
      } catch (error) {
        console.error(error);
        // error is managed by RPC.js, no need to display anything
      }
      setTableIsLoading(false);
    },
    [props.url],
  );

  const columns = [
    {
      title: '#',
      className: 'align-top no-break',
      render: (row) => {
        if (row?.index >= 0) {
          return (
            <div>
              <Text>{row.index}</Text>
            </div>
          );
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Transaction ID',
      className: 'align-top no-break',
      render: (row) => {
        if (row?.value?.id) {
          return (
            <div>
              <Link to={row.value.id}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <Icon />
                </IconContext.Provider>
                {row.entry}
              </Link>
            </div>
          );
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Type',
      className: 'align-top no-break',
      render: (tx) => {
        const txType = tx?.value?.message?.transaction?.body?.type;
        const sigType = tx?.value?.message?.signature?.type;
        const msgType = tx?.value?.message?.type;
        if (txType) {
          return <Tag color="green">{txType}</Tag>;
        } else if (sigType) {
          return <Tag color="green">{sigType}</Tag>;
        } else if (msgType) {
          return <Tag color="green">{msgType}</Tag>;
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
  ];

  if (account && issuer) {
    columns.push(
      {
        title: 'From',
        className: 'align-top no-break',
        render: (tx) => {
          const from =
            tx?.value?.message?.transaction?.body?.source ||
            tx?.value?.message?.transaction?.header?.principal;

          if (from === undefined) {
            return <Text disabled>N/A</Text>;
          } else if (from === url.toString()) {
            return <Text type="secondary">{from}</Text>;
          } else {
            return (
              <Link to={from}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {from}
              </Link>
            );
          }
        },
      },
      {
        title: 'To',
        className: 'align-top no-break',
        render: (tx) => {
          const to = tx?.value?.message?.transaction?.body?.to;
          const recipient =
            tx?.value?.message?.transaction?.body?.recipient ||
            tx?.value?.message?.transaction?.header?.principal;
          if (to || recipient) {
            if (to && Array.isArray(to) && to[0]) {
              return <Recipient to={to} issuer={issuer} />;
            }
            if (recipient) {
              if (recipient === account.url.toString()) {
                return <Text type="secondary">{recipient}</Text>;
              } else {
                return (
                  <Link to={'/acc/' + recipient.replace('acc://', '')}>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiAccountCircleLine />
                    </IconContext.Provider>
                    {recipient}
                  </Link>
                );
              }
            }
            //special case for acmeFaucet tx type
          } else if (tx.type === 'acmeFaucet' && tx.data.url) {
            return (
              <Link to={'/acc/' + tx.data.url.replace('acc://', '')}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {tx.data.url}
              </Link>
            );
            //special case, with no TO or RECIPIENT address
          } else if (
            (tx.type === 'syntheticDepositTokens' ||
              tx.type === 'syntheticDepositCredits') &&
            tx.origin
          ) {
            return <Text type="secondary">{tx.origin}</Text>;
          } else {
            return <Text disabled>N/A</Text>;
          }
        },
      },
      {
        title: 'Amount',
        className: 'align-top no-break',
        render: (tx) => {
          const to = tx?.value?.message?.transaction?.body?.to;
          const amount = tx?.value?.message?.transaction?.body?.amount;
          if (to && Array.isArray(to) && to[0]) {
            return <Amount to={to} issuer={issuer} />;
          } else if (amount) {
            return (
              <Descriptions.Item>
                <Tooltip
                  title={tokenAmountToLocaleString(
                    amount,
                    issuer.precision,
                    issuer.symbol,
                  )}
                >
                  {tokenAmount(amount, issuer.precision, issuer.symbol)}
                </Tooltip>
              </Descriptions.Item>
            );
          } else if (amount && tx.oracle) {
            //if not a TOKEN, then it is a CREDIT - NOT WORKING
            return <Text>{amount * tx.oracle * 1e-10} credits</Text>;
          } else {
            return <Text disabled>N/A</Text>;
          }
        },
      },
    );
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
        dataSource={txChain}
        renderItem={(item) => (
          <List.Item>
            <Link to={(item as any).id}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <Icon />
              </IconContext.Provider>
              {(item as any).id}
            </Link>
          </List.Item>
        )}
        style={{ marginBottom: '30px' }}
      />
    );
  }

  return (
    <Table
      dataSource={txChain}
      columns={columns}
      pagination={totalEntries > pagination.pageSize && pagination}
      rowKey="index"
      loading={tableIsLoading}
      scroll={{ x: 'max-content' }}
    />
  );
}

function Recipient({
  issuer,
  to,
}: {
  issuer: TokenIssuer;
  to: {
    url: string;
    amount: string;
  }[];
}) {
  const items = to.map((item, index) => (
    <Paragraph key={index}>
      {item.url === issuer.url.toString() ? (
        <Text type="secondary">{item.url}</Text>
      ) : (
        <span style={{ whiteSpace: 'nowrap' }}>
          <Link to={'/acc/' + item.url.replace('acc://', '')}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {item.url}
          </Link>
        </span>
      )}
    </Paragraph>
  ));
  return <span className="break-all">{items}</span>;
}

function Amount({
  issuer,
  to,
}: {
  issuer: TokenIssuer;
  to: {
    url: string;
    amount: string;
  }[];
}) {
  const items = to.map((item, index) => (
    <Paragraph key={index}>
      <Tooltip
        title={tokenAmountToLocaleString(
          item.amount,
          issuer.precision,
          issuer.symbol,
        )}
      >
        {tokenAmount(item.amount, issuer.precision, issuer.symbol)}
      </Tooltip>
    </Paragraph>
  ));
  return <span>{items}</span>;
}
