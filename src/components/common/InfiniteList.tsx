import { Button, List, Spin, Table, TableProps, Typography } from 'antd';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const { Text } = Typography;

export const PAGE_SIZE = 25;
export const SCROLL_HEIGHT = 600;
export const SCROLL_THRESHOLD_PX = 200;
export const URL_THROTTLE_MS = 250;
export const SHORT_LIST_LIMIT = 10;

/**
 * Pull a transaction-type string from a MessageRecord-shaped object.
 * Robust to missing fields so a single malformed tx doesn't break an
 * enrichment pass. Lifted from the MinorBlocks prototype so migrating
 * callers (#22, #24, #26) can drop their own copies.
 */
export function extractTxType(record: any): string | undefined {
  const msg = record?.message;
  if (!msg) return undefined;
  return msg?.transaction?.body?.type || msg?.type || undefined;
}

type EnrichmentMap = ReadonlyMap<unknown, unknown>;

const EnrichmentContext = createContext<EnrichmentMap | null>(null);

/**
 * Read the current enrichment map inside a `renderItem`. Returns `null`
 * when no `enrichPage` was provided by the caller.
 */
export function useInfiniteListEnrichment<K = unknown, V = unknown>(): ReadonlyMap<
  K,
  V
> | null {
  return useContext(EnrichmentContext) as ReadonlyMap<K, V> | null;
}

interface CommonProps<T> {
  /** Row renderer; component wraps the result in `<List.Item>` (list mode). */
  renderItem: (item: T, index: number) => ReactNode;
  /** `rowKey` equivalent for stable React keys. */
  rowKey?: (item: T, index: number) => React.Key;
  /**
   * Optional row-enrichment hook (e.g. batched message-query for tx lists).
   * Called once per loaded page; returned entries are merged into a map
   * consumers can read with {@link useInfiniteListEnrichment}.
   */
  enrichPage?: (items: T[]) => Promise<ReadonlyMap<unknown, unknown>>;
  /**
   * URL query-param name to bind the top-visible row to. When set, initial
   * offset is read from `URLSearchParams` at mount and scroll position
   * updates the param (throttled). Behaves like `?block=N` in MinorBlocks.
   */
  cursorParam?: string;
  /** Extract the cursor value for a row (required if `cursorParam` is set). */
  cursorOf?: (item: T) => string | number | null | undefined;
  /** Optional className forwarded to the inner List/Table. */
  className?: string;
  /** Text for empty list. Defaults to "No items". */
  emptyText?: ReactNode;
  /** Fixed scroll window height once the list exceeds `SHORT_LIST_LIMIT`. */
  scrollHeight?: number;
  /** Initial + increment page size for server mode. */
  pageSize?: number;
}

interface ArrayProps<T> extends CommonProps<T> {
  /** Array mode: caller owns the data, component slices for windowed render. */
  dataSource: T[];
}

interface ServerProps<T> extends CommonProps<T> {
  /** Server mode: total record count (used to decide short vs windowed). */
  total: number;
  /** Server mode: fetch a page. Called as `loadPage(start, count)`. */
  loadPage: (start: number, count: number) => Promise<T[]>;
}

export type InfiniteListProps<T> = ArrayProps<T> | ServerProps<T>;

function isServerProps<T>(p: InfiniteListProps<T>): p is ServerProps<T> {
  return typeof (p as ServerProps<T>).loadPage === 'function';
}

/**
 * Shared infinite-scroll list primitive.
 *
 * - Short list (<= {@link SHORT_LIST_LIMIT}): bordered antd List, no
 *   pagination, no scroll window.
 * - Long list: fixed-height scroll container, initial {@link PAGE_SIZE}
 *   rows, appends another page on scroll-to-bottom.
 *
 * Two data-source modes:
 * - **Array**: pass `dataSource`; component slices.
 * - **Server**: pass `total` + `loadPage`; component paginates.
 *
 * See {@link useInfiniteListEnrichment} for `enrichPage`, and
 * `cursorParam`/`cursorOf` for URL-cursor binding.
 */
export function InfiniteList<T>(props: InfiniteListProps<T>) {
  const {
    renderItem,
    rowKey,
    enrichPage,
    cursorParam,
    cursorOf,
    className,
    emptyText = 'No items',
    scrollHeight = SCROLL_HEIGHT,
    pageSize = PAGE_SIZE,
  } = props;

  const server = isServerProps(props);
  const total = server ? props.total : props.dataSource.length;
  const windowed = total > SHORT_LIST_LIMIT;

  const [items, setItems] = useState<T[]>(() =>
    server ? [] : props.dataSource.slice(0, windowed ? pageSize : total),
  );
  const [loading, setLoading] = useState(server); // Server mode starts loading.
  const [error, setError] = useState<unknown>(null);
  const [enrichment, setEnrichment] = useState<EnrichmentMap | null>(null);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false); // Guards against scroll-spam during fetch.
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Always call hooks unconditionally; the history/location are only
  // *used* when `cursorParam` is set. This keeps hook order stable if a
  // caller toggles the prop.
  const history = useHistory();
  const location = useLocation();

  const readCursor = useCallback((): string | null => {
    if (!cursorParam) return null;
    return new URLSearchParams(location.search).get(cursorParam);
  }, [cursorParam, location.search]);

  // Target cursor taken once at mount. We don't react to URL changes after
  // mount so scroll updates don't fight with programmatic restoration.
  const targetCursorRef = useRef<string | null>(readCursor());

  const hasMoreServer = server && items.length < total;
  const hasMoreArray =
    !server && windowed && items.length < props.dataSource.length;
  const hasMore = server ? hasMoreServer : hasMoreArray;

  const doLoadPage = useCallback(
    async (startOffset: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        let page: T[];
        if (server) {
          page = await props.loadPage(startOffset, pageSize);
        } else {
          page = props.dataSource.slice(startOffset, startOffset + pageSize);
        }
        if (!mountedRef.current) return;

        setItems((prev) => (append ? [...prev, ...page] : page));

        // Fire-and-forget enrichment: a slow batch query shouldn't block
        // the row-level render.
        if (enrichPage && page.length) {
          enrichPage(page)
            .then((map) => {
              if (!mountedRef.current || !map?.size) return;
              setEnrichment((prev) => {
                const next = new Map<unknown, unknown>(prev ?? []);
                for (const [k, v] of map) next.set(k, v);
                return next;
              });
            })
            .catch((e) => {
              // Enrichment is non-fatal; rows fall back to un-enriched.
              // eslint-disable-next-line no-console
              console.warn('InfiniteList enrichment failed:', e);
            });
        }
      } catch (e) {
        if (mountedRef.current) setError(e);
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    },
    // Deliberately omit `props.dataSource`/`props.loadPage` — they're
    // re-read from `props` inside the closure every call.
    [server, enrichPage, pageSize], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Initial load (server mode) and reset when total changes in array mode.
  useEffect(() => {
    mountedRef.current = true;
    if (server) {
      setItems([]);
      setEnrichment(null);
      doLoadPage(0, false);
    } else {
      setItems(props.dataSource.slice(0, windowed ? pageSize : total));
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, total]);

  // Scroll listener for infinite-scroll + URL cursor updates. Only attaches
  // in windowed mode where there's a scroll container.
  useEffect(() => {
    if (!windowed) return;
    const body = containerRef.current;
    if (!body) return;

    let throttle: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (
        !loadingRef.current &&
        hasMore &&
        body.scrollTop + body.clientHeight >=
          body.scrollHeight - SCROLL_THRESHOLD_PX
      ) {
        doLoadPage(items.length, true);
      }

      if (!cursorParam || !history || !cursorOf || throttle) return;
      throttle = setTimeout(() => {
        throttle = null;
        const rows = body.querySelectorAll<HTMLElement>('[data-row-key]');
        const bodyTop = body.getBoundingClientRect().top;
        for (const row of rows) {
          const rect = row.getBoundingClientRect();
          if (rect.bottom <= bodyTop + 2) continue;
          const key = row.getAttribute('data-row-key');
          const top = items.find((it, i) => {
            const k = rowKey ? rowKey(it, i) : i;
            return String(k) === key;
          });
          if (top !== undefined) {
            const c = cursorOf(top);
            if (c !== null && c !== undefined) {
              const current = new URLSearchParams(
                window.location.search,
              ).get(cursorParam);
              if (current !== String(c)) {
                const params = new URLSearchParams(window.location.search);
                params.set(cursorParam, String(c));
                history.replace({
                  pathname: window.location.pathname,
                  search: `?${params.toString()}`,
                });
              }
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
  }, [
    windowed,
    hasMore,
    items,
    doLoadPage,
    cursorParam,
    cursorOf,
    rowKey,
    history,
  ]);

  const retry = useCallback(() => {
    doLoadPage(items.length, items.length > 0);
  }, [doLoadPage, items.length]);

  const footer = useMemo<ReactNode>(() => {
    if (error) {
      return (
        <Text type="danger">
          Failed to load.{' '}
          <Button size="small" onClick={retry}>
            Retry
          </Button>
        </Text>
      );
    }
    if (loading && items.length > 0) {
      return (
        <Text type="secondary">
          <Spin size="small" /> Loading more…
        </Text>
      );
    }
    if (!hasMore && items.length > 0 && windowed) {
      return <Text type="secondary">End</Text>;
    }
    return null;
  }, [error, loading, hasMore, items.length, windowed, retry]);

  const content = (
    <EnrichmentContext.Provider value={enrichment}>
      <List
        className={className}
        bordered={!windowed}
        dataSource={items}
        locale={{ emptyText }}
        loading={loading && items.length === 0}
        renderItem={(item, index) => {
          const key = rowKey ? rowKey(item, index) : index;
          return (
            <List.Item key={key} data-row-key={String(key)}>
              {renderItem(item, index)}
            </List.Item>
          );
        }}
        footer={footer}
      />
    </EnrichmentContext.Provider>
  );

  if (!windowed) return content;

  return (
    <div
      ref={containerRef}
      style={{ height: scrollHeight, overflowY: 'auto' }}
      data-cursor-target={targetCursorRef.current ?? undefined}
    >
      {content}
    </div>
  );
}

// ------- Table variant (opt-in; same pagination/windowing rules) -------

interface CommonTableProps<T> {
  columns: NonNullable<TableProps<T>['columns']>;
  rowKey: TableProps<T>['rowKey'];
  enrichPage?: (items: T[]) => Promise<ReadonlyMap<unknown, unknown>>;
  className?: string;
  scrollHeight?: number;
  pageSize?: number;
  onSort?: TableProps<T>['onChange'];
  /** URL cursor binding — same semantics as {@link InfiniteList}. */
  cursorParam?: string;
  cursorOf?: (item: T) => string | number | null | undefined;
  showHeader?: TableProps<T>['showHeader'];
  sortDirections?: TableProps<T>['sortDirections'];
}

interface ArrayTableProps<T> extends CommonTableProps<T> {
  dataSource: T[];
}

interface ServerTableProps<T> extends CommonTableProps<T> {
  total: number;
  loadPage: (start: number, count: number) => Promise<T[]>;
}

export type InfiniteTableProps<T> = ArrayTableProps<T> | ServerTableProps<T>;

function isServerTableProps<T>(
  p: InfiniteTableProps<T>,
): p is ServerTableProps<T> {
  return typeof (p as ServerTableProps<T>).loadPage === 'function';
}

/**
 * Table variant of {@link InfiniteList}. Same windowing rule and
 * data-source modes; renders via antd `<Table>` so callers can pass
 * `columns` + `onSort` (wired via `onChange`).
 *
 * Migrations that need columnar layout (Block, Tokens, Validators, etc.)
 * use this; everything else should prefer {@link InfiniteList}.
 */
export function InfiniteTable<T extends object>(props: InfiniteTableProps<T>) {
  const {
    columns,
    rowKey,
    enrichPage,
    className,
    scrollHeight = SCROLL_HEIGHT,
    pageSize = PAGE_SIZE,
    onSort,
    cursorParam,
    cursorOf,
    showHeader,
    sortDirections,
  } = props;

  const server = isServerTableProps(props);
  const total = server ? props.total : props.dataSource.length;
  const windowed = total > SHORT_LIST_LIMIT;

  const [items, setItems] = useState<T[]>(() =>
    server ? [] : props.dataSource.slice(0, windowed ? pageSize : total),
  );
  const [loading, setLoading] = useState(server);
  const [error, setError] = useState<unknown>(null);
  const [enrichment, setEnrichment] = useState<EnrichmentMap | null>(null);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  // URL cursor binding: only used when `cursorParam` is set, but hooks
  // must be called unconditionally to keep hook order stable.
  const history = useHistory();

  const hasMoreServer = server && items.length < total;
  const hasMoreArray =
    !server && windowed && items.length < props.dataSource.length;
  const hasMore = server ? hasMoreServer : hasMoreArray;

  const doLoadPage = useCallback(
    async (startOffset: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        let page: T[];
        if (server) {
          page = await props.loadPage(startOffset, pageSize);
        } else {
          page = props.dataSource.slice(startOffset, startOffset + pageSize);
        }
        if (!mountedRef.current) return;
        setItems((prev) => (append ? [...prev, ...page] : page));

        if (enrichPage && page.length) {
          enrichPage(page)
            .then((map) => {
              if (!mountedRef.current || !map?.size) return;
              setEnrichment((prev) => {
                const next = new Map<unknown, unknown>(prev ?? []);
                for (const [k, v] of map) next.set(k, v);
                return next;
              });
            })
            .catch((e) => {
              // eslint-disable-next-line no-console
              console.warn('InfiniteTable enrichment failed:', e);
            });
        }
      } catch (e) {
        if (mountedRef.current) setError(e);
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    },
    [server, enrichPage, pageSize], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    mountedRef.current = true;
    if (server) {
      setItems([]);
      setEnrichment(null);
      doLoadPage(0, false);
    } else {
      setItems(props.dataSource.slice(0, windowed ? pageSize : total));
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, total]);

  // Attach scroll listener to the antd Table body once it renders.
  useEffect(() => {
    if (!windowed) return;
    // antd renders the scrollable body as `.ant-table-body` under the table
    // root. Find the most recent one under our className if provided.
    const root = className
      ? document.querySelector<HTMLElement>(`.${className}`)
      : null;
    const body =
      (root?.querySelector('.ant-table-body') as HTMLElement | null) ||
      document.querySelector<HTMLElement>('.ant-table-body');
    if (!body) return;

    let throttle: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (
        !loadingRef.current &&
        hasMore &&
        body.scrollTop + body.clientHeight >=
          body.scrollHeight - SCROLL_THRESHOLD_PX
      ) {
        doLoadPage(items.length, true);
      }

      if (!cursorParam || !history || !cursorOf || throttle) return;
      throttle = setTimeout(() => {
        throttle = null;
        const rows = body.querySelectorAll<HTMLElement>('[data-row-key]');
        const bodyTop = body.getBoundingClientRect().top;
        for (const row of rows) {
          const rect = row.getBoundingClientRect();
          if (rect.bottom <= bodyTop + 2) continue;
          const key = row.getAttribute('data-row-key');
          const top = items.find((it, i) => {
            const k =
              typeof rowKey === 'function'
                ? rowKey(it, i)
                : typeof rowKey === 'string'
                  ? (it as any)[rowKey]
                  : i;
            return String(k) === key;
          });
          if (top !== undefined) {
            const c = cursorOf(top);
            if (c !== null && c !== undefined) {
              const current = new URLSearchParams(
                window.location.search,
              ).get(cursorParam);
              if (current !== String(c)) {
                const params = new URLSearchParams(window.location.search);
                params.set(cursorParam, String(c));
                history.replace({
                  pathname: window.location.pathname,
                  search: `?${params.toString()}`,
                });
              }
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
  }, [
    windowed,
    hasMore,
    items,
    doLoadPage,
    className,
    cursorParam,
    cursorOf,
    rowKey,
    history,
  ]);

  return (
    <EnrichmentContext.Provider value={enrichment}>
      <Table<T>
        className={className}
        dataSource={items}
        columns={columns}
        rowKey={rowKey}
        pagination={false}
        onChange={onSort}
        showHeader={showHeader}
        sortDirections={sortDirections}
        loading={loading && items.length === 0}
        scroll={windowed ? { x: 'max-content', y: scrollHeight } : undefined}
        locale={{ emptyText: 'No items' }}
        footer={() => {
          if (error) {
            return (
              <Text type="danger">
                Failed to load.{' '}
                <Button
                  size="small"
                  onClick={() => doLoadPage(items.length, items.length > 0)}
                >
                  Retry
                </Button>
              </Text>
            );
          }
          if (loading && items.length > 0) {
            return (
              <Text type="secondary">
                <Spin size="small" /> Loading more…
              </Text>
            );
          }
          if (!hasMore && items.length > 0 && windowed) {
            return <Text type="secondary">End</Text>;
          }
          return null;
        }}
      />
    </EnrichmentContext.Provider>
  );
}
