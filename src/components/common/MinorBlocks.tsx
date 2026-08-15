import {
  Button,
  InputNumber,
  List,
  Space,
  Switch,
  TableProps,
  Tooltip,
  Typography,
} from 'antd';
import moment from 'moment';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { IconContext, IconType } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine } from 'react-icons/ri';
import { TiAnchor } from 'react-icons/ti';
import { Link as DomLink, useLocation, useNavigate } from 'react-router-dom';

import {
  BlockQueryArgsWithType,
  ChainEntryRecord,
  IndexEntryRecord,
  MinorBlockRecord,
  Record,
} from 'accumulate.js/lib/api_v3';

import { FilterRanger, Ranger, apiQuery } from '../../utils/Ranger';
import getBlockEntries from '../../utils/getBlockEntries';
import { extractTxType } from '../../utils/message';
import { utcOffsetLabel } from '../../utils/time';
import Count from './Count';
import { InfiniteTable, useInfiniteListEnrichment } from './InfiniteList';
import { Link } from './Link';
import { Network } from './Network';

const { Title, Text } = Typography;

interface BlockData {
  chain: ChainEntryRecord<IndexEntryRecord>;
  block: MinorBlockRecord;
  transactions: ChainEntryRecord[];
  anchors: ChainEntryRecord[];
}

interface TxInfo {
  type?: string;
}

const PAGE_SIZE = 25;

function readBlockFromUrl(search: string): number | null {
  const raw = new URLSearchParams(search).get('block');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const MinorBlocks = () => {
  const header = 'Minor Blocks';

  const [showAnchors, setShowAnchors] = useState(true);
  const [totalEntries, setTotalEntries] = useState(-1);

  const navigate = useNavigate();
  const location = useLocation();
  const [anchorInput, setAnchorInput] = useState<number | null>(
    readBlockFromUrl(location.search),
  );
  // Bumping this remounts the InfiniteTable so cursor restore runs again —
  // used when the anchor bar jumps to a different block.
  const [remountKey, setRemountKey] = useState(0);

  // Keep the anchor input in sync with the URL as the user scrolls (URL is
  // updated by the InfiniteTable cursor binding).
  useEffect(() => {
    setAnchorInput(readBlockFromUrl(location.search));
  }, [location.search]);

  const utcOffset = moment().utcOffset() / 60;

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
      title: 'Timestamp (UTC' + utcOffsetLabel(moment().utcOffset()) + ')',
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

  const isAnchor = (e: ChainEntryRecord) =>
    e.name == 'anchor-sequence' ||
    /acc:\/\/(dn|bvn-\w+)\.acme\/anchors/i.test(e.account.toString());

  function BlockTxs({ data }: { data: BlockData }) {
    const { transactions, anchors, block, chain } = data;
    const rootIndex = (chain as any)?.value?.value?.rootIndexIndex as
      | number
      | undefined;
    const txInfo = useInfiniteListEnrichment<string, TxInfo>();

    if (!transactions.length && !anchors.length)
      return <Text disabled>Empty block</Text>;

    const entries = showAnchors ? [...transactions, ...anchors] : transactions;

    if (!entries?.length) return <Text disabled>No transactions</Text>;

    return (
      <List
        size="small"
        className="compact-list"
        split={false}
        dataSource={entries}
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

          const anchorMode = isAnchor(item);
          const majorBlockTime =
            (item as any)?.value?.message?.majorBlockTime ||
            (item as any)?.value?.majorBlockTime;
          const hex = Buffer.from(item.entry).toString('hex');
          const accountPath = item.account.toString().replace(/^acc:\/\//, '');
          const type = txInfo?.get(hex)?.type;

          return (
            <List.Item key={item.index} style={{ background: 'none' }}>
              <Link
                to={item.account.withTxID(item.entry)}
                style={{ color: anchorMode ? 'gray' : null }}
              >
                <Tooltip overlayClassName="explorer-tooltip" title={tooltip}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <Icon />
                  </IconContext.Provider>
                  <span>
                    {anchorMode ? (
                      <>
                        anchor [{item.name || 'unknown'}]: block{' '}
                        <code>{block.index}</code>
                        {block.time && (
                          <>
                            {' @ '}
                            <code>{moment(block.time).format('HH:mm:ss')}</code>
                          </>
                        )}
                        {rootIndex !== undefined && (
                          <>
                            {' · root #'}
                            <code>{rootIndex}</code>
                          </>
                        )}
                        {majorBlockTime && (
                          <>
                            {' · major '}
                            <code>
                              {moment(majorBlockTime).format(
                                'YYYY-MM-DD HH:mm:ss',
                              )}
                            </code>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <code>{type || `${hex.slice(0, 8)} unknown`}</code> ·{' '}
                        {accountPath}
                        {block.time && (
                          <>
                            {' @ '}
                            <code>{moment(block.time).format('HH:mm:ss')}</code>
                          </>
                        )}
                      </>
                    )}
                  </span>
                </Tooltip>
              </Link>
            </List.Item>
          );
        }}
      />
    );
  }

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
    let total: number | undefined;
    return new Ranger<BlockData>(async (range) => {
      let { start, count } = range;
      let fromEnd: boolean;
      if (start == 0) {
        fromEnd = true;
      } else if (total !== undefined && start > total) {
        return { start: 0, total };
      } else if (total !== undefined) {
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

  const loadPage = useCallback(
    async (startOffset: number, count: number): Promise<BlockData[]> => {
      const src = showAnchors ? blocks : txnBlocks;
      try {
        const { records } = await src.get({ count, start: startOffset });
        if (startOffset === 0 && records.length > 0) {
          setTotalEntries(records[0].chain.value.value.blockIndex);
        }
        return records;
      } catch (e) {
        onApiError(e);
        return [];
      }
    },
    [blocks, txnBlocks, showAnchors, onApiError],
  );

  // Tx-row enrichment: one batched message-query per page, keyed by the
  // entry's tx hash (hex). Non-fatal — row renderer falls back to a
  // short-hash + "unknown" when a lookup is absent.
  const enrichPage = useCallback(
    async (pageBlocks: BlockData[]): Promise<Map<string, TxInfo>> => {
      const out = new Map<string, TxInfo>();
      type TxRef = { hex: string; entry: ChainEntryRecord };
      const refs: TxRef[] = [];
      for (const b of pageBlocks) {
        for (const entry of b.transactions) {
          refs.push({
            hex: Buffer.from(entry.entry).toString('hex'),
            entry,
          });
        }
      }
      if (!refs.length) return out;
      try {
        const txRecords = await api.call(
          refs.map(({ entry }) => ({
            method: 'query',
            params: {
              scope: entry.account.withTxID(entry.entry).toString(),
              query: { queryType: 'default' },
            },
          })),
        );
        refs.forEach((ref, i) => {
          const type = extractTxType(txRecords[i]);
          if (type) out.set(ref.hex, { type });
        });
      } catch (e) {
        console.warn('Tx-row enrichment failed:', (e as Error)?.message);
      }
      return out;
    },
    [api],
  );

  // Treat the page size * a large multiplier as total so InfiniteTable keeps
  // `hasMore` true until a short page is returned. We don't know the
  // ultimate total until the Ranger exhausts.
  const [totalGuess] = useState(Number.MAX_SAFE_INTEGER);

  const jumpToBlock = (n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    setAnchorInput(n);
    navigate(
      {
        pathname: location.pathname,
        search: `?block=${n}`,
      },
      { replace: true },
    );
    setRemountKey((k) => k + 1);
  };

  const resetToLatest = () => {
    setAnchorInput(null);
    navigate({ pathname: location.pathname, search: '' }, { replace: true });
    setRemountKey((k) => k + 1);
  };

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

      <Space className="block-anchor-bar" style={{ marginBottom: 12 }}>
        <Text strong>Anchor block:</Text>
        <InputNumber
          value={anchorInput ?? undefined}
          onChange={(v) => setAnchorInput(typeof v === 'number' ? v : null)}
          onPressEnter={() => anchorInput !== null && jumpToBlock(anchorInput)}
          placeholder="Block #"
          min={0}
          controls={false}
          style={{ width: 160 }}
        />
        <Button
          type="primary"
          onClick={() => anchorInput !== null && jumpToBlock(anchorInput)}
        >
          Go
        </Button>
        <Button onClick={resetToLatest}>Latest</Button>
      </Space>

      <InfiniteTable<BlockData>
        key={`${network.id}:${showAnchors}:${remountKey}`}
        className="minor-blocks-table"
        columns={columns}
        rowKey={(x) => x.chain.index}
        total={totalGuess}
        loadPage={loadPage}
        enrichPage={enrichPage}
        pageSize={PAGE_SIZE}
        cursorParam="block"
        cursorOf={(b) => b.block?.index}
      />
    </>
  );
};

export default MinorBlocks;
