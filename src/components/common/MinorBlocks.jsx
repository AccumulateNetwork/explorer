import { Skeleton, Table, Tooltip, Typography } from 'antd';
import moment from 'moment-timezone';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

import RPC from '../../utils/RPC';
import getBlockEntries from '../../utils/getBlockEntries';
import Count from './Count';

const { Title, Text } = Typography;

const MinorBlocks = (props) => {
  //let type = props.type ? props.type : 'main'
  let header = 'Minor Blocks';

  const [minorBlocks, setMinorBlocks] = useState(null);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    current: 1,
  });
  const [totalEntries, setTotalEntries] = useState(-1);

  //let tz = moment.tz.guess();
  let utcOffset = moment().utcOffset() / 60;

  const columns = [
    {
      title: 'Block',
      className: 'code',
      width: 30,
      render: (row) => {
        if (row) {
          return (
            <div>
              <Link to={'/block/' + row.index}>{row.index}</Link>
            </div>
          );
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Timestamp (UTC' + (utcOffset < 0 ? '-' : '+') + utcOffset + ')',
      width: 225,
      render: (row) => {
        if (row) {
          if (row.time) {
            return (
              <Text className="code">
                {moment(row.time).format('YYYY-MM-DD HH:mm:ss')}
              </Text>
            );
          } else {
            return <Text disabled>Timestamp not recorded</Text>;
          }
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Transactions',
      render: (row) => {
        if (row) {
          if (row?.entries) {
            return <BlockTxs data={row.entries} />;
          } else {
            return <Text disabled>Empty block</Text>;
          }
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
    {
      title: 'Number of txs',
      className: 'code',
      width: 88,
      align: 'center',
      render: (row) => {
        if (row) {
          if (row.entries?.records?.length) {
            return <Text>{row.entries.records.length}</Text>;
          } else {
            return <Text disabled>—</Text>;
          }
        } else {
          return <Text disabled>N/A</Text>;
        }
      },
    },
  ];

  function BlockTxs(props) {
    if (!props?.data?.records) return <Text disabled>Empty block</Text>;
    const items = props.data.records.map((item) => (
      <span key={item.entry}>
        <Tooltip
          overlayClassName="explorer-tooltip"
          title={
            item.name === 'main'
              ? 'transaction'
              : item.name === 'anchor-sequence'
                ? 'anchor'
                : item.name
                  ? item.name
                  : 'unknown'
          }
        >
          <Link to={'/tx/' + item.entry}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiExchangeLine />
            </IconContext.Provider>
            {item.entry}
          </Link>
        </Tooltip>
        <br />
      </span>
    ));
    return <span className="break-all">{items}</span>;
  }

  const getMinorBlocks = async (params = pagination) => {
    setTableIsLoading(true);

    if (!params) return;
    const start = (params.current - 1) * params.pageSize; // in `query-minor-blocks` API the first item has index 1, not 0

    let response;
    try {
      response = await RPC.request(
        'query',
        {
          scope: 'dn.acme',
          query: {
            queryType: 'block',
            minorRange: { fromEnd: true, count: params.pageSize, start },
          },
        },
        'v3',
      );
    } catch (error) {
      // error is managed by RPC.js, no need to display anything
    }

    if (response && response.recordType === 'range') {
      for (const block of response.records) {
        if (!block.entries?.records) continue;
        block.entries.records = getBlockEntries(block);
      }

      setMinorBlocks(response.records.reverse());
      setPagination({
        ...pagination,
        current: params.current,
        pageSize: params.pageSize,
        total: response.total,
      });
      setTotalEntries(response.total);
    }
    setTableIsLoading(false);
  };

  useEffect(() => {
    getMinorBlocks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {props.url || 'acc://dn.acme' ? (
        <div>
          <Title level={3} style={{ marginTop: 30 }}>
            {header}
            <Count count={totalEntries ? totalEntries : 0} />
          </Title>

          <Table
            dataSource={minorBlocks}
            columns={columns}
            pagination={pagination}
            rowKey="index"
            loading={tableIsLoading}
            onChange={getMinorBlocks}
            scroll={{ x: 'max-content' }}
          />
        </div>
      ) : (
        <div>
          <div>
            <Title level={3}>{header}</Title>
            <div className="skeleton-holder">
              <Skeleton active />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinorBlocks;
