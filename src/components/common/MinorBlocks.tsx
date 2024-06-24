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

import { FilterRanger, Ranger, apiQuery } from '../../utils/Ranger';
import getBlockEntries from '../../utils/getBlockEntries';
import { CompactList } from './CompactList';
import Count from './Count';
import { Link } from './Link';
import { Network } from './Network';
import { useAsyncEffect } from './useAsync';

const { Title, Text } = Typography;

interface BlockData {
  chain: ChainEntryRecord<IndexEntryRecord>;
  block: MinorBlockRecord;
  transactions: ChainEntryRecord[];
  anchors: ChainEntryRecord[];
}

const MinorBlocks = () => {
  let header = 'Minor Blocks';

  const [showAnchors, setShowAnchors] = useState(false);
  const [minorBlocks, setMinorBlocks] = useState<BlockData[]>(null);
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

  const columns: TableProps<BlockData>['columns'] = [
    {
      title: 'Block',
      className: 'code',
      width: 30,
      render: ({ block: row }: BlockData) => {
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
      render: ({ block: row }: BlockData) => {
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
      render: (data: BlockData) => {
        if (!data) {
          return <Text disabled>N/A</Text>;
        }
        if (!data?.block.entries) {
          return <Text disabled>Empty block</Text>;
        }
        return <BlockTxs data={data} />;
      },
    },
    {
      title: 'Number of txs',
      className: 'code',
      width: 88,
      align: 'center',
      render: ({ block, anchors, transactions }: BlockData) => {
        if (!block.entries?.records?.length) {
          return <Text disabled>—</Text>;
        }
        return (
          <Text>
            {(showAnchors ? anchors.length : 0) + transactions.length}
          </Text>
        );
      },
    },
  ];

  function BlockTxs({ data: { transactions, anchors } }: { data: BlockData }) {
    if (!transactions.length && !anchors.length)
      return <Text disabled>Empty block</Text>;

    const entries = showAnchors ? [...transactions, ...anchors] : transactions;

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

  const isAnchor = (e: ChainEntryRecord) =>
    e.name == 'anchor-sequence' ||
    /acc:\/\/(dn|bvn-\w+)\.acme\/anchors/i.test(e.account.toString());

  const { api, network, onApiError } = useContext(Network);
  const [blocks] = useState(() => {
    const query = apiQuery<ChainEntryRecord<IndexEntryRecord>>(
      api,
      'dn.acme/ledger',
      {
        queryType: 'chain',
        name: 'root-index',
        range: { expand: true },
      },
    );
    let total;
    return new Ranger<BlockData>(async (range) => {
      let { start, count } = range;
      let fromEnd: boolean;
      if (start == 0) {
        fromEnd = true;
      } else if (start > total) {
        return { start: 0, total: total };
      } else {
        start = total - start - count;
        if (start < 0) {
          count += start;
          start = 0;
        }
      }

      const r = await query({ start, count, fromEnd });
      total = r.total || 0;
      if (!r.records) r.records = [];
      r.records.reverse();

      const records = await api
        .call(
          r.records.map((x) => ({
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
        .then((x) =>
          x.map((y, i) => {
            const chain = r.records[i];
            const block = Record.fromObject(y) as MinorBlockRecord;

            let transactions: ChainEntryRecord[] = [];
            let anchors: ChainEntryRecord[] = [];
            if (block.entries?.records) {
              block.entries.records = getBlockEntries(block);
              transactions = block.entries.records.filter((r) => !isAnchor(r));
              anchors = block.entries.records.filter((r) => isAnchor(r));
            }

            return {
              chain,
              block,
              transactions,
              anchors,
            };
          }),
        );

      return {
        records,
        total,
        start: range.start,
      };
    });
  });
  const [txnBlocks] = useState(
    new FilterRanger(
      (range) => blocks.get(range),
      (r) => r.transactions.length > 0,
    ),
  );
  useAsyncEffect(
    async (mounted) => {
      setTableIsLoading(true);

      const src = showAnchors ? blocks : txnBlocks;
      const { records } = await src.get({
        count: pagination.pageSize,
        start: (pagination.current - 1) * pagination.pageSize,
      });
      if (!mounted()) {
        return;
      }

      if (pagination.current == 1 && records.length > 0) {
        setTotalEntries(records[0].chain.value.value.blockIndex);
      }

      setMinorBlocks(records);
      setPagination({
        ...pagination,
        total:
          typeof src.total === 'number'
            ? src.total
            : (pagination.current + 1) * pagination.pageSize,
      });
      setTableIsLoading(false);
    },
    [JSON.stringify(pagination), network.id, showAnchors],
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
        rowKey={(x) => x.chain.index}
        loading={tableIsLoading}
        onChange={(p) => setPagination(p)}
        scroll={{ x: 'max-content' }}
      />
    </>
  );
};

export default MinorBlocks;
