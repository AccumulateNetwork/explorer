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
import { useLocation, useNavigate } from 'react-router-dom';

const { Text } = Typography;

export const PAGE_SIZE = 25;
export const SCROLL_HEIGHT = 600;
export const SCROLL_THRESHOLD_PX = 200;
export const URL_THROTTLE_MS = 250;
export const SHORT_LIST_LIMIT = 10;

type EnrichmentMap = ReadonlyMap<unknown, unknown>;

const EnrichmentContext = createContext<EnrichmentMap | null>(null);

/**
 * Read the current enrichment map inside a `renderItem`. Returns `null`
 * when no `enrichPage` was provided by the caller.
 */
export function useInfiniteListEnrichment<
  K = unknown,
  V = unknown,
>(): ReadonlyMap<K, V> | null {
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

  // Latest props, for async callbacks: doLoadPage used to read the `props`
  // captured when its memo was created, re-slicing a stale dataSource after
  // the caller replaced it (#40).
  const latest = useRef(props);
  latest.current = props;
  const itemsCountRef = useRef(0);
  itemsCountRef.current = items.length;

  // Array-mode content identity: a new array of the same length — or the same
  // array with replaced elements — must re-sync the visible rows. Keying the
  // reset effect on the length alone left the /network table permanently
  // blank (its 2s poll rebuilds same-length entries), the Favourites star
  // never visually toggled, and /block/N -> /block/N+1 kept block N's rows
  // under block N+1's heading when both had the same count (#40). The compare
  // runs against a snapshot copy so in-place element replacement is caught.
  const contentVersion = useRef(0);
  const contentSnapshot = useRef<readonly T[] | null>(null);
  if (!server) {
    const cur = props.dataSource;
    const prev = contentSnapshot.current;
    if (
      !prev ||
      prev.length !== cur.length ||
      cur.some((x, i) => x !== prev[i])
    ) {
      contentVersion.current++;
      contentSnapshot.current = cur.slice();
    }
  }

  // Always call hooks unconditionally; the history/location are only
  // *used* when `cursorParam` is set. This keeps hook order stable if a
  // caller toggles the prop.
  const navigate = useNavigate();
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
        const p = latest.current;
        if (isServerProps(p)) {
          page = await p.loadPage(startOffset, pageSize);
        } else {
          page = p.dataSource.slice(startOffset, startOffset + pageSize);
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
      // Keep as many rows visible as were already loaded, so a content
      // refresh (poll, favourite toggle) doesn't yank a scrolled list back
      // to the first page.
      const keep = windowed ? Math.max(itemsCountRef.current, pageSize) : total;
      const page = props.dataSource.slice(0, keep);
      setItems(page);
      setEnrichment(null);
      // Array mode used to skip enrichment on mount (enrichPage was only
      // wired into server-mode doLoadPage). Short-list callers that pass
      // enrichPage (MsgInfo/TxnInfo cause+produced) need this to populate
      // type labels instead of rendering `unknown`.
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
            console.warn('InfiniteList enrichment failed:', e);
          });
      }
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, total, contentVersion.current]);

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
              const current = new URLSearchParams(window.location.search).get(
                cursorParam,
              );
              if (current !== String(c)) {
                const params = new URLSearchParams(window.location.search);
                params.set(cursorParam, String(c));
                navigate(
                  {
                    pathname: window.location.pathname,
                    search: `?${params.toString()}`,
                  },
                  { replace: true },
                );
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
  /** Pass-through antd `Table` prop; OR-ed with internal loading state. */
  loading?: TableProps<T>['loading'];
  /** Pass-through antd `Table` prop. */
  rowClassName?: TableProps<T>['rowClassName'];
  /** Pass-through antd `Table` prop. */
  expandable?: TableProps<T>['expandable'];
  /**
   * URL query-param name to bind the top-visible row to. When set, initial
   * offset is read from `URLSearchParams` at mount and scroll position
   * updates the param (throttled). Mirrors the {@link InfiniteList} prop.
   */
  cursorParam?: string;
  /** Extract the cursor value for a row (required if `cursorParam` is set). */
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
    loading: externalLoading,
    rowClassName,
    expandable,
    cursorParam,
    cursorOf,
    showHeader,
    sortDirections,
  } = props;

  const navigate = useNavigate();

  const server = isServerTableProps(props);
  const total = server ? props.total : props.dataSource.length;
  const windowed = total > SHORT_LIST_LIMIT;

  const [items, setItems] = useState<T[]>(() =>
    server ? [] : props.dataSource.slice(0, windowed ? pageSize : total),
  );
  const [loading, setLoading] = useState(server);
  const [error, setError] = useState<unknown>(null);
  const [enrichment, setEnrichment] = useState<EnrichmentMap | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  // Same staleness fixes as InfiniteList — see the comments there (#40).
  const latest = useRef(props);
  latest.current = props;
  const itemsCountRef = useRef(0);
  itemsCountRef.current = items.length;
  const contentVersion = useRef(0);
  const contentSnapshot = useRef<readonly T[] | null>(null);
  if (!server) {
    const cur = props.dataSource;
    const prev = contentSnapshot.current;
    if (
      !prev ||
      prev.length !== cur.length ||
      cur.some((x, i) => x !== prev[i])
    ) {
      contentVersion.current++;
      contentSnapshot.current = cur.slice();
    }
  }

  const hasMoreServer = server && !exhausted && items.length < total;
  const hasMoreArray =
    !server && windowed && items.length < props.dataSource.length;
  const hasMore = server ? hasMoreServer : hasMoreArray;

  // Cursor restore: capture the URL cursor once at mount. `restoredRef`
  // flips true once we've scrolled the target row to the top (or given up).
  const initialCursor =
    cursorParam && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get(cursorParam)
      : null;
  const targetCursorRef = useRef<string | null>(initialCursor);
  const restoredRef = useRef<boolean>(targetCursorRef.current === null);

  const doLoadPage = useCallback(
    async (startOffset: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        let page: T[];
        const p = latest.current;
        if (isServerTableProps(p)) {
          page = await p.loadPage(startOffset, pageSize);
        } else {
          page = p.dataSource.slice(startOffset, startOffset + pageSize);
        }
        if (!mountedRef.current) return;
        setItems((prev) => (append ? [...prev, ...page] : page));
        // A short page (fewer than requested) means the source is exhausted —
        // prevents infinite retries when `total` is unknown / set as a guess.
        if (server && page.length < pageSize) setExhausted(true);

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
    [server, enrichPage, pageSize],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (server) {
      setItems([]);
      setEnrichment(null);
      setExhausted(false);
      doLoadPage(0, false);
    } else {
      const keep = windowed ? Math.max(itemsCountRef.current, pageSize) : total;
      const page = props.dataSource.slice(0, keep);
      setItems(page);
      setEnrichment(null);
      // Array mode used to skip enrichment on mount; mirror the InfiniteList
      // fix so array-mode callers that pass enrichPage get their types.
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
            console.warn('InfiniteTable enrichment failed:', e);
          });
      }
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, total, contentVersion.current]);

  // After each load, if a target cursor was present at mount, try to scroll
  // the matching row to the top. If not yet in view, keep loading more pages
  // (capped at 20). This mirrors the bespoke restore loop in MinorBlocks.
  useEffect(() => {
    if (restoredRef.current || loading || !cursorOf || !cursorParam) return;
    const target = targetCursorRef.current;
    if (target === null) return;
    const MAX_RESTORE_PAGES = 20;

    const idx = items.findIndex((it) => {
      const c = cursorOf(it);
      return c !== null && c !== undefined && String(c) === target;
    });
    if (idx >= 0) {
      requestAnimationFrame(() => {
        const root = className
          ? document.querySelector<HTMLElement>(`.${className}`)
          : null;
        const body =
          (root?.querySelector('.ant-table-body') as HTMLElement | null) ||
          document.querySelector<HTMLElement>('.ant-table-body');
        const rows = body?.querySelectorAll<HTMLElement>('tr.ant-table-row');
        if (body && rows?.[idx]) {
          const bodyTop = body.getBoundingClientRect().top;
          const rowTop = rows[idx].getBoundingClientRect().top;
          body.scrollTop += rowTop - bodyTop;
        }
        restoredRef.current = true;
      });
    } else if (hasMore && items.length < MAX_RESTORE_PAGES * pageSize) {
      doLoadPage(items.length, true);
    } else {
      restoredRef.current = true;
    }
  }, [
    loading,
    items,
    hasMore,
    cursorOf,
    cursorParam,
    pageSize,
    className,
    doLoadPage,
  ]);

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
      if (!restoredRef.current) return;
      throttle = setTimeout(() => {
        throttle = null;
        const rows = body.querySelectorAll<HTMLElement>('tr[data-row-key]');
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
              const current = new URLSearchParams(window.location.search).get(
                cursorParam,
              );
              if (current !== String(c)) {
                const params = new URLSearchParams(window.location.search);
                params.set(cursorParam, String(c));
                navigate(
                  {
                    pathname: window.location.pathname,
                    search: `?${params.toString()}`,
                  },
                  { replace: true },
                );
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
        rowClassName={rowClassName}
        expandable={expandable}
        pagination={false}
        onChange={onSort}
        showHeader={showHeader}
        sortDirections={sortDirections}
        loading={externalLoading || (loading && items.length === 0)}
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
