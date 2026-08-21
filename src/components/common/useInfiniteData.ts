import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  Enrichment,
  PageState,
  Source,
  hasMore as computeHasMore,
  initialState,
  isWindowed,
  reduce,
  sameContent,
  visibleCount,
} from './pagination';

/**
 * A list's data, in whichever of the two modes the caller chose.
 *
 * Server mode pages through `loadPage` against a caller-supplied `total`;
 * array mode slices `dataSource`, which the caller owns.
 */
export interface InfiniteSource<T> {
  loadPage?: (start: number, count: number) => Promise<T[]>;
  total?: number;
  dataSource?: T[];
}

export interface InfiniteData<T> {
  state: PageState<T>;
  source: Source;
  hasMore: boolean;
  windowed: boolean;
  total: number;
  /** Fetch or slice a page, appending or replacing. */
  loadPage: (startOffset: number, append: boolean) => void;
  /**
   * Append the next page, taking the offset from the rows actually loaded.
   *
   * Scroll handlers must use this rather than passing `items.length`: their
   * closure holds the count from the render that attached them, so a second
   * scroll event arriving before React commits the first page re-requests the
   * same offset and appends it twice (duplicate React keys, 25 rows becoming
   * 75).
   */
  loadMore: () => void;
  /** Re-run the load that failed, keeping whatever is already on screen. */
  retry: () => void;
  /**
   * Whether a fetch is in flight, read synchronously.
   *
   * The `loading` flag on the state lags by a render, which is too late to
   * gate a scroll handler firing several events per frame.
   */
  isLoading: () => boolean;
}

/**
 * Loading, paging, exhaustion, and enrichment for an infinite list.
 *
 * InfiniteList and InfiniteTable each carried their own copy of this; the
 * copies diverged, and the one in InfiniteList was the one missing exhaustion
 * detection (#62). The rules themselves live in `pagination.ts`, which is
 * pure and tested; this hook is only the wiring.
 */
export function useInfiniteData<T>(opts: {
  source: InfiniteSource<T>;
  pageSize: number;
  enrichPage?: (items: T[]) => Promise<Enrichment>;
  /** Names the component in the non-fatal enrichment warning. */
  label: string;
}): InfiniteData<T> {
  const { source, pageSize, enrichPage, label } = opts;

  const server = typeof source.loadPage === 'function';
  const total = server ? source.total ?? 0 : source.dataSource?.length ?? 0;
  const windowed = isWindowed(total);

  const [state, dispatch] = useReducer(
    reduce as (
      s: PageState<T>,
      a: Parameters<typeof reduce>[1],
    ) => PageState<T>,
    undefined,
    () =>
      initialState<T>(
        server
          ? []
          : source.dataSource?.slice(0, windowed ? pageSize : total) ?? [],
        server, // Server mode has a request in flight from the first render.
      ),
  );

  const mountedRef = useRef(true);
  const loadingRef = useRef(false); // Guards against scroll-spam during fetch.

  // Latest source, for async callbacks: the loader used to read the source
  // captured when its memo was created, re-slicing a stale dataSource after
  // the caller replaced it (#40).
  const latest = useRef(source);
  latest.current = source;

  // How many rows are loaded, updated the moment a page arrives rather than
  // at the next render. Refreshing it during render leaves a window between a
  // fetch resolving and React committing in which a scroll event re-requests
  // the offset just fetched and appends it a second time — 25 rows became 75
  // with 25 keys duplicated under any burst of scroll events.
  const loadedRef = useRef(0);

  // Array-mode content identity. Keying the reset on length alone left the
  // /network table permanently blank, the Favourites star silently untoggled,
  // and /block/N -> /block/N+1 showing block N's rows (#40).
  const contentVersion = useRef(0);
  const contentSnapshot = useRef<readonly T[] | null>(null);
  if (!server) {
    const cur = source.dataSource ?? [];
    if (!sameContent(contentSnapshot.current, cur)) {
      contentVersion.current++;
      contentSnapshot.current = cur.slice();
    }
  }

  // Fire-and-forget: a slow batch query must not block the row-level render,
  // and a failed one leaves rows un-enriched rather than erroring the list.
  const runEnrichment = useCallback(
    (page: T[]) => {
      if (!enrichPage || !page.length) {
        return;
      }
      enrichPage(page)
        .then((entries) => {
          if (!mountedRef.current || !entries?.size) {
            return;
          }
          dispatch({ type: 'enriched', entries });
        })
        .catch((e) => {
          console.warn(`${label} enrichment failed:`, e);
        });
    },
    [enrichPage, label],
  );

  const loadPage = useCallback(
    async (startOffset: number, append: boolean) => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      dispatch({ type: 'loading' });
      try {
        const p = latest.current;
        const page = p.loadPage
          ? await p.loadPage(startOffset, pageSize)
          : p.dataSource?.slice(startOffset, startOffset + pageSize) ?? [];
        if (!mountedRef.current) {
          return;
        }
        loadedRef.current = append
          ? loadedRef.current + page.length
          : page.length;
        dispatch({
          type: 'page',
          page,
          append,
          // Only a server source can report its own end this way; an array
          // source's length is already known exactly.
          short: !!p.loadPage && page.length < pageSize,
        });
        runEnrichment(page);
      } catch (e) {
        if (mountedRef.current) {
          dispatch({ type: 'failed', error: e });
        }
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) {
          dispatch({ type: 'settled' });
        }
      }
    },
    // `latest` is re-read inside the closure, so the source itself is
    // deliberately not a dependency.
    [pageSize, runEnrichment],
  );

  // Initial load, and re-sync when the source changes underneath us.
  useEffect(() => {
    mountedRef.current = true;
    if (server) {
      loadedRef.current = 0;
      dispatch({ type: 'reset', items: [] });
      loadPage(0, false);
    } else {
      const page = (latest.current.dataSource ?? []).slice(
        0,
        visibleCount({ windowed, total, pageSize, loaded: loadedRef.current }),
      );
      loadedRef.current = page.length;
      dispatch({ type: 'reset', items: page });
      // Array mode used to skip enrichment entirely — it was wired only into
      // the server path — so short-list callers passing `enrichPage`
      // (MsgInfo/TxnInfo cause+produced) rendered `unknown` type labels.
      runEnrichment(page);
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, total, contentVersion.current]);

  const src: Source = { server, windowed, total };

  const loadMore = useCallback(() => {
    loadPage(loadedRef.current, true);
  }, [loadPage]);

  const retry = useCallback(() => {
    loadPage(loadedRef.current, loadedRef.current > 0);
  }, [loadPage]);

  const isLoading = useCallback(() => loadingRef.current, []);

  return {
    state,
    source: src,
    hasMore: computeHasMore(state, src),
    windowed,
    total,
    loadPage,
    loadMore,
    retry,
    isLoading,
  };
}
