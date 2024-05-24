import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import { Typography, Skeleton, Table, Tag, List } from 'antd';

import { IconContext } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine, RiTimerLine } from 'react-icons/ri';

import Count from './Count';
import RPC from './RPC';
import AccLink from './AccLink';

const { Title, Text } = Typography;

const TxChain = (props) => {
  let type = props.type ? props.type : 'transaction';
  let header;
  switch (type) {
    case 'pending':
      header = 'Pending Transactions';
      break;
    case 'signature':
      header = 'Signature Chain';
      break;
    default:
      header = 'Transactions';
      break;
  }

  const [txChain, setTxChain] = useState(null);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
  });
  const [totalEntries, setTotalEntries] = useState(-1);

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
              <AccLink to={row.value.id}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <Icon />
                </IconContext.Provider>
                {row.entry}
              </AccLink>
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

  const getTxChain = async (params = pagination) => {
    setTableIsLoading(true);
    let start = 0;

    if (params) {
      start = (params.current - 1) * params.pageSize;
    }

    try {
      let response;
      if (type === 'pending')
        response = await RPC.request(
          'query',
          {
            scope: props.url,
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
            scope: props.url,
            query: {
              queryType: 'chain',
              name: type === 'transaction' ? 'main' : type,
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

      if (response) {
        // workaround API bug response
        if (response.start === null || response.start === undefined) {
          response.start = 0;
        }
        setTxChain(response.records.reverse());
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
      // error is managed by RPC.js, no need to display anything
    }
    setTableIsLoading(false);
  };

  useEffect(() => {
    getTxChain();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {props.url && type ? (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <Icon />
            </IconContext.Provider>
            {header}
            <Count count={totalEntries ? totalEntries : 0} />
          </Title>

          {txChain && type === 'pending' ? (
            <List
              size="small"
              bordered
              dataSource={txChain}
              renderItem={(item) => (
                <List.Item>
                  <Link to={'/tx/' + item.id}>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <Icon />
                    </IconContext.Provider>
                    {item.id}
                  </Link>
                </List.Item>
              )}
              style={{ marginBottom: '30px' }}
            />
          ) : (
            <Table
              dataSource={txChain}
              columns={columns}
              pagination={pagination}
              rowKey="txid"
              loading={tableIsLoading}
              onChange={getTxChain}
              scroll={{ x: 'max-content' }}
            />
          )}
        </div>
      ) : (
        <div>
          <div>
            <Title level={4}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <Icon />
              </IconContext.Provider>
              {header}
            </Title>
            <div className="skeleton-holder">
              <Skeleton active />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TxChain;
