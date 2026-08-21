import { Button, List, Spin, Table, TableProps, Typography } from 'antd';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

import { Enrichment, footerState } from './pagination';
import { useInfiniteData } from './useInfiniteData';
import { useInfiniteScroll } from './useInfiniteScroll';

const { Text } = Typography;

export const PAGE_SIZE = 25;
export const SCROLL_HEIGHT = 600;
export { SHORT_LIST_LIMIT } from './pagination';
export { SCROLL_THRESHOLD_PX, URL_THROTTLE_MS } from './useInfiniteScroll';

const EnrichmentContext = createContext<Enrichment | null>(null);

/**
 * Read the current enrichment map inside a `renderItem`. Returns `null`
 * when no `enrichPage` was provided by the caller.
 *
 * Keys are strings by construction — the map used to be typed
 * `ReadonlyMap<unknown, unknown>` and read through an unchecked cast, which
 * let two incompatible keying conventions share one context (#62).
 */
export function useInfiniteListEnrichment<
  K extends string = string,
  V = unknown,
>(): ReadonlyMap<K, V> | null {
  return useContext(EnrichmentContext) as ReadonlyMap<K, V> | null;
}

interface SharedProps<T> {
  /**
   * Optional row-enrichment hook (e.g. batched message-query for tx lists).
   * Called once per loaded page; returned entries are merged into a map
   * consumers can read with {@link useInfiniteListEnrichment}.
   */
  enrichPage?: (items: T[]) => Promise<Enrichment>;
  /**
   * URL query-param name to bind the top-visible row to. When set, the
   * initial offset is read from `URLSearchParams` at mount and scroll
   * position updates the param (throttled). Behaves like `?block=N` in
   * MinorBlocks.
   */
  cursorParam?: string;
  /** Extract the cursor value for a row (required if `cursorParam` is set). */
  cursorOf?: (item: T) => string | number | null | undefined;
  /** Optional className forwarded to the inner List/Table. */
  className?: string;
  /** Fixed scroll window height once the list exceeds `SHORT_LIST_LIMIT`. */
  scrollHeight?: number;
  /** Initial + increment page size for server mode. */
  pageSize?: number;
}

/** Array mode: the caller owns the data and the component slices it. */
interface ArrayMode<T> {
  dataSource: T[];
}

/** Server mode: the component pages through `loadPage` against `total`. */
interface ServerMode<T> {
  total: number;
  loadPage: (start: number, count: number) => Promise<T[]>;
}

type ModeProps<T> = ArrayMode<T> | ServerMode<T>;

function isServerMode<T>(p: ModeProps<T>): p is ServerMode<T> {
  return typeof (p as ServerMode<T>).loadPage === 'function';
}

/** The mode props, in the shape {@link useInfiniteData} consumes. */
function sourceOf<T>(p: ModeProps<T>) {
  return isServerMode(p)
    ? { loadPage: p.loadPage, total: p.total }
    : { dataSource: p.dataSource };
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer({
  state,
  onRetry,
}: {
  state: ReturnType<typeof footerState>;
  onRetry: () => void;
}) {
  switch (state) {
    case 'error':
      return (
        <Text type="danger">
          Failed to load.{' '}
          <Button size="small" onClick={onRetry}>
            Retry
          </Button>
        </Text>
      );
    case 'loading':
      return (
        <Text type="secondary">
          <Spin size="small" /> Loading more…
        </Text>
      );
    case 'end':
      return <Text type="secondary">End</Text>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

interface ListOnlyProps<T> extends SharedProps<T> {
  /** Row renderer; component wraps the result in `<List.Item>`. */
  renderItem: (item: T, index: number) => ReactNode;
  /** `rowKey` equivalent for stable React keys. */
  rowKey?: (item: T, index: number) => React.Key;
  /** Text for empty list. Defaults to "No items". */
  emptyText?: ReactNode;
}

export type InfiniteListProps<T> = ListOnlyProps<T> & ModeProps<T>;

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
 * Paging lives in {@link useInfiniteData} and scrolling in
 * {@link useInfiniteScroll}, both shared with {@link InfiniteTable}.
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

  const { state, source, hasMore, windowed, loadMore, isLoading, retry } =
    useInfiniteData<T>({
      source: sourceOf(props),
      pageSize,
      enrichPage,
      label: 'InfiniteList',
    });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const getBody = useCallback(() => containerRef.current, []);
  const keyOf = useCallback(
    (item: T, index: number) => (rowKey ? rowKey(item, index) : index),
    [rowKey],
  );

  const { targetCursor } = useInfiniteScroll<T>({
    getBody,
    windowed,
    hasMore,
    loading: state.loading,
    isLoading,
    items: state.items,
    keyOf,
    pageSize,
    loadMore,
    cursorParam,
    cursorOf,
  });

  const footer = useMemo(
    () => <Footer state={footerState(state, source)} onRetry={retry} />,
    [state, source, retry],
  );

  const content = (
    <EnrichmentContext.Provider value={state.enrichment}>
      <List
        className={className}
        bordered={!windowed}
        dataSource={state.items}
        locale={{ emptyText }}
        loading={state.loading && state.items.length === 0}
        renderItem={(item, index) => {
          const key = keyOf(item, index);
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

  if (!windowed) {
    return content;
  }

  return (
    <div
      ref={containerRef}
      style={{ height: scrollHeight, overflowY: 'auto' }}
      data-cursor-target={targetCursor ?? undefined}
    >
      {content}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

interface TableOnlyProps<T> extends SharedProps<T> {
  columns: NonNullable<TableProps<T>['columns']>;
  rowKey: TableProps<T>['rowKey'];
  onSort?: TableProps<T>['onChange'];
  /** Pass-through antd `Table` prop; OR-ed with internal loading state. */
  loading?: TableProps<T>['loading'];
  /** Pass-through antd `Table` prop. */
  rowClassName?: TableProps<T>['rowClassName'];
  /** Pass-through antd `Table` prop. */
  expandable?: TableProps<T>['expandable'];
  showHeader?: TableProps<T>['showHeader'];
  sortDirections?: TableProps<T>['sortDirections'];
}

export type InfiniteTableProps<T> = TableOnlyProps<T> & ModeProps<T>;

/**
 * Table variant of {@link InfiniteList}. Same windowing rule, same data-source
 * modes, same paging hooks; renders via antd `<Table>` so callers can pass
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

  const { state, source, hasMore, windowed, loadMore, isLoading, retry } =
    useInfiniteData<T>({
      source: sourceOf(props),
      pageSize,
      enrichPage,
      label: 'InfiniteTable',
    });

  // antd renders the scrollable body as `.ant-table-body` under the table
  // root, and gives us no ref to it — so we wrap and search our own subtree.
  //
  // This used to be a document query keyed on `className`, which bound every
  // instance to the first table on the page when the class was absent, and
  // left such tables with no scroll listener at all once that was guarded
  // against — NetworkDashboard renders one per partition with no className
  // (#62). Scoping structurally removes the dependency on the convention.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const getBody = useCallback(
    () =>
      rootRef.current?.querySelector<HTMLElement>('.ant-table-body') ?? null,
    [],
  );

  const keyOf = useCallback(
    (item: T, index: number): React.Key =>
      typeof rowKey === 'function'
        ? rowKey(item, index)
        : typeof rowKey === 'string'
          ? ((item as Record<string, unknown>)[rowKey] as React.Key)
          : index,
    [rowKey],
  );

  useInfiniteScroll<T>({
    getBody,
    windowed,
    hasMore,
    loading: state.loading,
    isLoading,
    items: state.items,
    keyOf,
    pageSize,
    loadMore,
    cursorParam,
    cursorOf,
  });

  return (
    <EnrichmentContext.Provider value={state.enrichment}>
      <div ref={rootRef}>
        <Table<T>
          className={className}
          dataSource={state.items}
          columns={columns}
          rowKey={rowKey}
          rowClassName={rowClassName}
          expandable={expandable}
          pagination={false}
          onChange={onSort}
          showHeader={showHeader}
          sortDirections={sortDirections}
          loading={
            externalLoading || (state.loading && state.items.length === 0)
          }
          scroll={windowed ? { x: 'max-content', y: scrollHeight } : undefined}
          locale={{ emptyText: 'No items' }}
          footer={() => (
            <Footer state={footerState(state, source)} onRetry={retry} />
          )}
        />
      </div>
    </EnrichmentContext.Provider>
  );
}
