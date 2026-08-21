import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const SCROLL_THRESHOLD_PX = 200;
export const URL_THROTTLE_MS = 250;
/** Give up restoring a cursor rather than paging a whole chain to find it. */
export const MAX_RESTORE_PAGES = 20;

/** Rows are tagged with `data-row-key` by both the List and the Table. */
const ROW_SELECTOR = '[data-row-key]';

export interface InfiniteScrollOptions<T> {
  /**
   * The scrolling element. InfiniteList owns its container outright;
   * InfiniteTable has to reach for the `.ant-table-body` antd renders. Must
   * be scoped to this instance — a document-wide lookup bound every table on
   * the page to the first one (#62).
   */
  getBody: () => HTMLElement | null;
  windowed: boolean;
  hasMore: boolean;
  /** Committed loading state, for deciding when restore may run. */
  loading: boolean;
  /**
   * Loading state read synchronously. A scroll handler fires several times a
   * frame, long before a `loading` state change commits.
   */
  isLoading: () => boolean;
  items: T[];
  /** Must agree with the `data-row-key` the renderer writes. */
  keyOf: (item: T, index: number) => React.Key;
  pageSize: number;
  /** Appends the next page; takes its offset from the loaded rows, not here. */
  loadMore: () => void;
  /** URL query param bound to the top-visible row. */
  cursorParam?: string;
  cursorOf?: (item: T) => string | number | null | undefined;
}

/**
 * Infinite-scroll paging plus optional two-way binding of the top-visible row
 * to a URL query param.
 *
 * Both components ran their own copy of this. Cursor *restore* existed in only
 * one of them, so InfiniteList accepted `cursorParam`/`cursorOf` and
 * documented reading the initial offset from the URL while doing no such
 * thing (#62). Sharing the implementation is what makes the documented
 * behaviour true of both.
 *
 * @returns the cursor found in the URL at mount, for the caller to expose.
 */
export function useInfiniteScroll<T>(opts: InfiniteScrollOptions<T>): {
  targetCursor: string | null;
} {
  const {
    getBody,
    windowed,
    hasMore,
    loading,
    isLoading,
    items,
    keyOf,
    pageSize,
    loadMore,
    cursorParam,
    cursorOf,
  } = opts;

  const navigate = useNavigate();

  // Taken once at mount: reacting to later URL changes would have scroll
  // updates fighting programmatic restoration.
  const targetCursorRef = useRef<string | null>(
    cursorParam && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get(cursorParam)
      : null,
  );
  // Flips once the target row has been scrolled to the top, or given up on.
  const restoredRef = useRef<boolean>(targetCursorRef.current === null);

  const writeCursor = useCallback(
    (value: string) => {
      if (!cursorParam) {
        return;
      }
      const search = new URLSearchParams(window.location.search);
      if (search.get(cursorParam) === value) {
        return;
      }
      search.set(cursorParam, value);
      navigate(
        {
          pathname: window.location.pathname,
          search: `?${search.toString()}`,
        },
        { replace: true },
      );
    },
    [cursorParam, navigate],
  );

  // Restore: once rows are loaded, scroll the row matching the URL cursor to
  // the top, paging further if it has not arrived yet.
  useEffect(() => {
    if (restoredRef.current || loading || !cursorParam || !cursorOf) {
      return;
    }
    const target = targetCursorRef.current;
    if (target === null) {
      return;
    }

    const idx = items.findIndex((it) => {
      const c = cursorOf(it);
      return c !== null && c !== undefined && String(c) === target;
    });

    if (idx >= 0) {
      requestAnimationFrame(() => {
        const body = getBody();
        const rows = body?.querySelectorAll<HTMLElement>(ROW_SELECTOR);
        if (body && rows?.[idx]) {
          body.scrollTop +=
            rows[idx].getBoundingClientRect().top -
            body.getBoundingClientRect().top;
        }
        restoredRef.current = true;
      });
    } else if (hasMore && items.length < MAX_RESTORE_PAGES * pageSize) {
      loadMore();
    } else {
      restoredRef.current = true;
    }
  }, [
    loading,
    items,
    hasMore,
    cursorParam,
    cursorOf,
    pageSize,
    loadMore,
    getBody,
  ]);

  // Everything the scroll handler needs, refreshed every render. Reading
  // through a ref is what lets the listener attach once (below) instead of on
  // every change to `items` or to a caller's inline `rowKey`/`cursorOf`
  // arrow.
  const live = useRef({
    hasMore,
    items,
    keyOf,
    cursorParam,
    cursorOf,
    isLoading,
    loadMore,
    writeCursor,
  });
  live.current = {
    hasMore,
    items,
    keyOf,
    cursorParam,
    cursorOf,
    isLoading,
    loadMore,
    writeCursor,
  };

  // Paging on scroll, and writing the top-visible row back to the URL.
  //
  // Attached once per scroll container. Re-attaching on every dependency
  // change — as both copies of this used to — tore down the listener several
  // times a second, and its cleanup cancelled any throttled URL write still
  // pending, so `?block=` was dropped whenever a render landed within
  // URL_THROTTLE_MS of a scroll. Callers pass inline arrows for `rowKey` and
  // `cursorOf`, so that was most renders.
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!windowed) {
      return;
    }
    const body = getBody();
    if (!body) {
      return;
    }

    const onScroll = () => {
      const l = live.current;

      if (
        !l.isLoading() &&
        l.hasMore &&
        body.scrollTop + body.clientHeight >=
          body.scrollHeight - SCROLL_THRESHOLD_PX
      ) {
        l.loadMore();
      }

      if (!l.cursorParam || !l.cursorOf || throttleRef.current) {
        return;
      }
      // Don't fight the restore scroll we are about to perform.
      if (!restoredRef.current) {
        return;
      }
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
        const cur = live.current;
        if (!cur.cursorOf) {
          return;
        }
        const rows = body.querySelectorAll<HTMLElement>(ROW_SELECTOR);
        const bodyTop = body.getBoundingClientRect().top;
        for (const row of rows) {
          // The first row not yet scrolled past the top edge.
          if (row.getBoundingClientRect().bottom <= bodyTop + 2) {
            continue;
          }
          const key = row.getAttribute('data-row-key');
          const top = cur.items.find(
            (it, i) => String(cur.keyOf(it, i)) === key,
          );
          if (top !== undefined) {
            const c = cur.cursorOf(top);
            if (c !== null && c !== undefined) {
              cur.writeCursor(String(c));
            }
          }
          break;
        }
      }, URL_THROTTLE_MS);
    };

    body.addEventListener('scroll', onScroll);
    return () => {
      body.removeEventListener('scroll', onScroll);
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
    };
  }, [windowed, getBody]);

  return { targetCursor: targetCursorRef.current };
}
