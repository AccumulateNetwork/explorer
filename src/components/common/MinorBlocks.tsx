import {
  Skeleton,
  Table,
  TablePaginationConfig,
  Tooltip,
  Typography,
} from 'antd';
import moment from 'moment-timezone';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiExchangeLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

import {
  ErrorRecord,
  MinorBlockRecord,
  RecordRange,
  RecordType,
} from 'accumulate.js/lib/api_v3';

import getBlockEntries from '../../utils/getBlockEntries';
import { CompactList } from './CompactList';
import Count from './Count';
import { Shared } from './Shared';
import { useAsyncEffect } from './useAsync';

const { Title, Text } = Typography;

const MinorBlocks = (props) => {
  //let type = props.type ? props.type : 'main'
  let header = 'Minor Blocks';

  const [minorBlocks, setMinorBlocks] = useState(null);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
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
    return (
      <CompactList
        dataSource={props.data.records}
        limit={5}
        renderItem={(item: any) => (
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
        )}
      />
    );
  }

  const { api } = useContext(Shared);
  useAsyncEffect(
    async (mounted) => {
      setTableIsLoading(true);

      const r = await api.query('dn.acme', {
        queryType: 'block',
        minorRange: {
          fromEnd: true,
          count: pagination.pageSize,
          start: (pagination.current - 1) * pagination.pageSize,
        },
      });
      if (!mounted()) {
        return;
      }
      const { records = [] } = r;
      for (const block of records) {
        if (!block.entries?.records) continue;
        block.entries.records = getBlockEntries(block);
      }
      records.reverse();
      setMinorBlocks(records.map((r) => r.asObject()));
      setPagination({
        ...pagination,
        total: r.total,
      });
      setTotalEntries(r.total);
      setTableIsLoading(false);
    },
    [JSON.stringify(pagination)],
  );

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
            columns={columns as any}
            pagination={pagination}
            rowKey="index"
            loading={tableIsLoading}
            onChange={(p) => setPagination(p)}
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
