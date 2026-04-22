import {
  Button,
  InputNumber,
  List,
  Space,
  Switch,
  Table,
  TableProps,
  Tooltip,
  Typography,
} from 'antd';
import moment from 'moment-timezone';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { IconContext, IconType } from 'react-icons';
import { RiExchangeLine, RiShieldCheckLine } from 'react-icons/ri';
import { TiAnchor } from 'react-icons/ti';
import { Link as DomLink, useHistory, useLocation } from 'react-router-dom';

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

const { Title, Text } = Typography;

interface BlockData {
  chain: ChainEntryRecord<IndexEntryRecord>;
  block: MinorBlockRecord;
  transactions: ChainEntryRecord[];
  anchors: ChainEntryRecord[];
}

const PAGE_SIZE = 100;
const SCROLL_HEIGHT = 600;
const SCROLL_THRESHOLD_PX = 200;
const URL_THROTTLE_MS = 250;
const MAX_RESTORE_PAGES = 20; // Give up looking for a target block after 2000 loaded.

function readBlockFromUrl(search: string): number | null {
  const raw = new URLSearchParams(search).get('block');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function scrollRowToTop(body: HTMLElement, row: HTMLElement) {
  const bodyTop = body.getBoundingClientRect().top;
  const rowTop = row.getBoundingClientRect().top;
  body.scrollTop += rowTop - bodyTop;
}

const MinorBlocks = () => {
  let header = 'Minor Blocks';

  const [showAnchors, setShowAnchors] = useState(true);
  const [minorBlocks, setMinorBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [totalEntries, setTotalEntries] = useState(-1);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false); // Guards against scroll-spam during fetch.

  const history = useHistory();
  const location = useLocation();
  // Target block taken once from the URL at mount. We don't react to URL
  // changes after mount so scroll updates don't fight with scroll restoration.
  const targetBlockRef = useRef<number | null>(readBlockFromUrl(location.search));
  const restoredRef = useRef(targetBlockRef.current === null);
  const [anchorInput, setAnchorInput] = useState<number | null>(
    targetBlockRef.current,
  );

  // Keep the anchor input in sync with the URL as the user scrolls (URL
  // is updated by the scroll handler below).
  useEffect(() => {
    setAnchorInput(readBlockFromUrl(location.search));
  }, [location.search]);

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

  function BlockTxs({ data }: { data: BlockData }) {
    const { transactions, anchors, block, chain } = data;
    // Pull the most interesting values off the root-index entry so the
    // anchor rows can show Minor Block Index + Root Chain Index —
    // the same fields the per-transaction Properties panel exposes.
    const rootIndex = (chain as any)?.value?.value?.rootIndexIndex as
      | number
      | undefined;

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

          const anchorMode = isAnchor(item);
          // MakeMajorBlock messages carry a majorBlockTime field on the
          // message body. If the block query expanded the entry, pull it
          // off for display; otherwise it stays undefined.
          const majorBlockTime =
            (item as any)?.value?.message?.majorBlockTime ||
            (item as any)?.value?.majorBlockTime;

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
                            <code>
                              {moment(block.time).format('HH:mm:ss')}
                            </code>
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
                        <code>{Buffer.from(item.entry).toString('hex')}</code>@
                        {item.account.toString().replace(/^acc:\/\//, '')}
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
  const loadPage = useCallback(
    async (startOffset: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const src = showAnchors ? blocks : txnBlocks;
        const { records } = await src.get({
          count: PAGE_SIZE,
          start: startOffset,
        });
        if (!mountedRef.current) return;
        if (startOffset === 0 && records.length > 0) {
          setTotalEntries(records[0].chain.value.value.blockIndex);
        }
        setMinorBlocks((prev) =>
          append ? [...prev, ...records] : records,
        );
        setHasMore(records.length === PAGE_SIZE);
      } catch (e) {
        onApiError(e);
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    },
    [blocks, txnBlocks, showAnchors, onApiError],
  );

  // Reset + initial 100 on mount, network change, or anchors-toggle.
  useEffect(() => {
    mountedRef.current = true;
    setMinorBlocks([]);
    setHasMore(true);
    loadPage(0, false);
    return () => {
      mountedRef.current = false;
    };
  }, [network.id, showAnchors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore the previously-viewed block: if the URL carried ?block=N at
  // mount, keep loading pages until we find it, then scroll it to the top.
  // After restoration, clear the flag so live scrolling can take over.
  useEffect(() => {
    if (restoredRef.current || loading) return;
    const target = targetBlockRef.current;
    if (target === null) return;

    const idx = minorBlocks.findIndex((b) => b.block?.index === target);
    if (idx >= 0) {
      // Found — scroll to it on the next paint so the row is laid out.
      requestAnimationFrame(() => {
        const body = document.querySelector<HTMLElement>(
          '.minor-blocks-table .ant-table-body',
        );
        const rows = body?.querySelectorAll<HTMLElement>('tr.ant-table-row');
        if (body && rows?.[idx]) scrollRowToTop(body, rows[idx]);
        restoredRef.current = true;
      });
    } else if (hasMore && minorBlocks.length < MAX_RESTORE_PAGES * PAGE_SIZE) {
      loadPage(minorBlocks.length, true);
    } else {
      // Target is too old to restore automatically. Give up and let live
      // scrolling take over.
      restoredRef.current = true;
    }
  }, [loading, minorBlocks, hasMore, loadPage]);

  // Scroll listener: infinite-scroll load + throttled URL updates so the
  // top-visible block is reflected in ?block=N (and hence the search field).
  useEffect(() => {
    const body = document.querySelector<HTMLElement>(
      '.minor-blocks-table .ant-table-body',
    );
    if (!body) return;

    let throttle: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      // Infinite scroll: load more when approaching the bottom.
      if (
        !loadingRef.current &&
        hasMore &&
        body.scrollTop + body.clientHeight >=
          body.scrollHeight - SCROLL_THRESHOLD_PX
      ) {
        loadPage(minorBlocks.length, true);
      }

      // Update URL with top visible block, throttled.
      if (throttle || !restoredRef.current) return;
      throttle = setTimeout(() => {
        throttle = null;
        const rows = body.querySelectorAll<HTMLElement>('tr.ant-table-row');
        const bodyTop = body.getBoundingClientRect().top;
        for (const row of rows) {
          const rect = row.getBoundingClientRect();
          if (rect.bottom <= bodyTop + 2) continue;
          const key = row.getAttribute('data-row-key');
          const top = minorBlocks.find((b) => String(b.chain.index) === key);
          if (top?.block?.index) {
            const current = readBlockFromUrl(window.location.search);
            if (current !== top.block.index) {
              const params = new URLSearchParams(window.location.search);
              params.set('block', String(top.block.index));
              history.replace({
                pathname: window.location.pathname,
                search: `?${params.toString()}`,
              });
            }
          }
          break;
        }
      }, URL_THROTTLE_MS);
    };

    body.addEventListener('scroll', onScroll);
    return () => {
      body.removeEventListener('scroll', onScroll);
      if (throttle) clearTimeout(throttle);
    };
  }, [hasMore, minorBlocks, loadPage, history]);

  const jumpToBlock = (n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    targetBlockRef.current = n;
    restoredRef.current = false;
    setAnchorInput(n);
    history.replace({
      pathname: location.pathname,
      search: `?block=${n}`,
    });
    setMinorBlocks([]);
    setHasMore(true);
    loadPage(0, false);
  };

  const resetToLatest = () => {
    targetBlockRef.current = null;
    restoredRef.current = true;
    setAnchorInput(null);
    history.replace({ pathname: location.pathname, search: '' });
    setMinorBlocks([]);
    setHasMore(true);
    loadPage(0, false);
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
          onChange={(v) =>
            setAnchorInput(typeof v === 'number' ? v : null)
          }
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

      <Table
        className="minor-blocks-table"
        dataSource={minorBlocks}
        columns={columns}
        pagination={false}
        rowKey={(x) => x.chain.index}
        loading={loading && minorBlocks.length === 0}
        scroll={{ x: 'max-content', y: SCROLL_HEIGHT }}
        footer={() =>
          loading && minorBlocks.length > 0 ? (
            <Text type="secondary">Loading more…</Text>
          ) : !hasMore && minorBlocks.length > 0 ? (
            <Text type="secondary">End of blocks</Text>
          ) : null
        }
      />
    </>
  );
};

export default MinorBlocks;
