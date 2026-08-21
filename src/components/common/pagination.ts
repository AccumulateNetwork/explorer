/**
 * The pagination state machine behind InfiniteList and InfiniteTable.
 *
 * This is deliberately free of React and the DOM. The two components used to
 * carry a byte-identical copy of this logic each, which is how they came to
 * disagree about exhaustion and cursor restore (#62); keeping the rules here
 * means there is one place to change them and one place to test them. Scroll
 * position is not simulable in jsdom, but none of the decisions below depend
 * on it — they depend on counts, which are.
 */

/** Lists at or below this length render bordered and unwindowed. */
export const SHORT_LIST_LIMIT = 10;

export type Enrichment = ReadonlyMap<string, unknown>;

export interface PageState<T> {
  items: T[];
  loading: boolean;
  error: unknown;
  /** The source returned a short page, so there is nothing left to ask for. */
  exhausted: boolean;
  enrichment: Enrichment | null;
}

export type PageAction<T> =
  /** A fetch has started. */
  | { type: 'loading' }
  /** A fetch returned. `short` means fewer rows came back than were asked. */
  | { type: 'page'; page: T[]; append: boolean; short: boolean }
  | { type: 'failed'; error: unknown }
  /** A fetch finished, successfully or not. */
  | { type: 'settled' }
  /** The data source changed underneath us; start over from `items`. */
  | { type: 'reset'; items: T[] }
  | { type: 'enriched'; entries: Enrichment };

export function initialState<T>(items: T[], loading: boolean): PageState<T> {
  return { items, loading, error: null, exhausted: false, enrichment: null };
}

export function reduce<T>(
  state: PageState<T>,
  action: PageAction<T>,
): PageState<T> {
  switch (action.type) {
    case 'loading':
      // Clearing the error here is what lets Retry show a spinner rather than
      // leaving the failure message up beside it.
      return { ...state, loading: true, error: null };

    case 'page':
      return {
        ...state,
        items: action.append ? [...state.items, ...action.page] : action.page,
        // Latching, not assigning: a later full-length page must not
        // un-exhaust a source that already reported its end.
        exhausted: state.exhausted || action.short,
      };

    case 'failed':
      return { ...state, error: action.error };

    case 'settled':
      return { ...state, loading: false };

    case 'reset':
      return initialState(action.items, false);

    case 'enriched': {
      if (!action.entries.size) {
        return state;
      }
      const next = new Map<string, unknown>(state.enrichment ?? []);
      for (const [k, v] of action.entries) {
        next.set(k, v);
      }
      return { ...state, enrichment: next };
    }
  }
}

/** Whether the list renders in a fixed-height scroll window. */
export function isWindowed(total: number): boolean {
  return total > SHORT_LIST_LIMIT;
}

export interface Source {
  /** Server mode pages through `loadPage`; array mode slices `dataSource`. */
  server: boolean;
  windowed: boolean;
  /** Server: the caller's record count. Array: `dataSource.length`. */
  total: number;
}

/**
 * Whether scrolling to the bottom should ask for another page.
 *
 * In server mode `total` may be a guess, so `exhausted` — set by a short page
 * — is the authority. Without it a list whose guess runs high re-requests
 * forever; that was the state InfiniteList shipped in.
 */
export function hasMore<T>(state: PageState<T>, source: Source): boolean {
  if (source.server) {
    return !state.exhausted && state.items.length < source.total;
  }
  return source.windowed && state.items.length < source.total;
}

/**
 * How many array-mode rows to show after the source changes.
 *
 * Keeps at least what was already loaded, so a background poll or a
 * favourite-toggle doesn't yank a scrolled list back to its first page.
 */
export function visibleCount(opts: {
  windowed: boolean;
  total: number;
  pageSize: number;
  loaded: number;
}): number {
  const { windowed, total, pageSize, loaded } = opts;
  return windowed ? Math.min(Math.max(loaded, pageSize), total) : total;
}

export type FooterState = 'error' | 'loading' | 'end' | null;

/** Which of the three mutually exclusive footers to render, if any. */
export function footerState<T>(
  state: PageState<T>,
  source: Source,
): FooterState {
  if (state.error) {
    return 'error';
  }
  // The empty-list spinner is the container's job, not the footer's.
  if (state.loading && state.items.length > 0) {
    return 'loading';
  }
  if (!hasMore(state, source) && state.items.length > 0 && source.windowed) {
    return 'end';
  }
  return null;
}

/**
 * Whether two array-mode sources hold the same rows.
 *
 * Length alone is not enough: /network's 2s poll rebuilds same-length entries,
 * and /block/N -> /block/N+1 kept the previous block's rows under the new
 * heading whenever the counts matched (#40).
 */
export function sameContent<T>(
  prev: readonly T[] | null,
  next: readonly T[],
): boolean {
  return (
    prev !== null &&
    prev.length === next.length &&
    next.every((x, i) => x === prev[i])
  );
}
