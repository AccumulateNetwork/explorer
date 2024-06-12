import {
  List,
  Switch,
  Table,
  TablePaginationConfig,
  TableProps,
  Tooltip,
  Typography,
} from 'antd';
import moment from 'moment-timezone';
import React, { useContext, useState } from 'react';
import { IconContext, IconType } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine } from 'react-icons/ri';
import { TiAnchor } from 'react-icons/ti';
import { Link as DomLink } from 'react-router-dom';

import {
  BlockQueryArgsWithType,
  ChainEntryRecord,
  IndexEntryRecord,
  MinorBlockRecord,
  Record,
} from 'accumulate.js/lib/api_v3';

import { ChainFilter } from '../../utils/ChainFilter';
import getBlockEntries from '../../utils/getBlockEntries';
import { CompactList } from './CompactList';
import Count from './Count';
import { Link } from './Link';
import { Shared } from './Network';
import { useAsyncEffect } from './useAsync';

const { Title, Text } = Typography;

const MinorBlocks = () => {
  let header = 'Minor Blocks';

  const [showAnchors, setShowAnchors] = useState(false);
  const [minorBlocks, setMinorBlocks] = useState<MinorBlockRecord[]>(null);
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

  const columns: TableProps<MinorBlockRecord>['columns'] = [
    {
      title: 'Block',
      className: 'code',
      width: 30,
      render: (row: MinorBlockRecord) => {
        if (row) {
          return (
            <div>
              <DomLink to={'/block/' + row.index}>{row.index}</DomLink>
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
      render: (row: MinorBlockRecord) => {
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
      render: (row: MinorBlockRecord) => {
        if (row) {
          if (row?.entries) {
            return <BlockTxs entries={row.entries?.records} />;
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
      render: (row: MinorBlockRecord) => {
        if (!row.entries?.records) {
          return <Text disabled>—</Text>;
        }
        const { length } = showAnchors
          ? row.entries.records
          : row.entries.records.filter((x) => !isAnchor(x));
        return <Text>{length}</Text>;
      },
    },
  ];

  const isAnchor = (e: ChainEntryRecord) =>
    e.name == 'anchor-sequence' ||
    /acc:\/\/(dn|bvn-\w+)\.acme\/anchors/i.test(e.account.toString());

  function BlockTxs({ entries }: { entries: ChainEntryRecord[] | undefined }) {
    if (!entries?.length) return <Text disabled>Empty block</Text>;

    entries = [
      ...entries.filter((x) => !isAnchor(x)),
      ...(showAnchors ? entries.filter((x) => isAnchor(x)) : []),
    ];

    if (!entries?.length) return <Text disabled>No transactions</Text>;

    return (
      <CompactList
        dataSource={entries}
        limit={5}
        renderItem={(item: ChainEntryRecord) => {
          let tooltip: string;
          let Icon: IconType;
          if (item.name == 'anchor-sequence') {
            tooltip = 'anchor';
            Icon = TiAnchor;
          } else if (item.name == 'main') {
            tooltip = 'transaction';
            Icon = RiExchangeLine;
          } else if (item.name == 'signature') {
            tooltip = 'signature';
            Icon = RiShieldCheckLine;
          } else {
            tooltip = item.name || 'unknown';
            Icon = RiExchangeLine;
          }

          return (
            <List.Item key={item.index} style={{ background: 'none' }}>
              <Link
                to={item.account.withTxID(item.entry)}
                style={{ color: isAnchor(item) ? 'gray' : null }}
              >
                <Tooltip overlayClassName="explorer-tooltip" title={tooltip}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <Icon />
                  </IconContext.Provider>
                  <span>
                    <code>{Buffer.from(item.entry).toString('hex')}</code>@
                    {item.account.toString().replace(/^acc:\/\//, '')}
                  </span>
                </Tooltip>
              </Link>
            </List.Item>
          );
        }}
      />
    );
  }

  const { api, network, onApiError } = useContext(Shared);
  const [chain] = useState(
    new ChainFilter<ChainEntryRecord<IndexEntryRecord>>(api, 'dn.acme/ledger', {
      queryType: 'chain',
      name: 'root-index',
    }),
  );
  useAsyncEffect(
    async (mounted) => {
      setTableIsLoading(true);

      const { records: index = [] } = await chain.getRange({
        count: pagination.pageSize,
        start: (pagination.current - 1) * pagination.pageSize,
      });
      const records = await api
        .call(
          index.map((x) => ({
            method: 'query',
            params: {
              scope: 'dn.acme/ledger',
              query: {
                queryType: 'block',
                minor: x.value.value.blockIndex,
              } satisfies BlockQueryArgsWithType,
            },
          })),
        )
        .then((x) => x.map((y) => Record.fromObject(y) as MinorBlockRecord));
      if (!mounted()) {
        return;
      }
      for (const block of records) {
        if (!block.entries?.records) continue;
        block.entries.records = getBlockEntries(block);
      }

      if (pagination.current == 1 && index.length > 0) {
        setTotalEntries(index[0].value.value.blockIndex);
      }

      setMinorBlocks(records);
      setPagination({
        ...pagination,
        total: chain.total,
      });
      setTableIsLoading(false);
    },
    [JSON.stringify(pagination), network.id],
  ).catch(onApiError);

  return (
    <>
      <Title level={3} style={{ marginTop: 30 }}>
        {header}
        <Count count={totalEntries ? totalEntries : 0} />

        <Tooltip
          overlayClassName="explorer-tooltip"
          title={showAnchors ? 'Hide anchors' : 'Show anchors'}
        >
          <Switch
            style={{ marginLeft: 15 }}
            checked={showAnchors}
            onChange={setShowAnchors}
            checkedChildren={
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
            }
            unCheckedChildren={
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <TiAnchor />
              </IconContext.Provider>
            }
          />
        </Tooltip>
      </Title>

      <Table
        dataSource={minorBlocks}
        columns={columns}
        pagination={pagination}
        rowKey="index"
        loading={tableIsLoading}
        onChange={(p) => setPagination(p)}
        scroll={{ x: 'max-content' }}
      />
    </>
  );
};

export default MinorBlocks;
