/**
 * Request de-duplication and a short freshness window for API queries.
 *
 * There is no request cache anywhere in the app, which compounds the N+1
 * patterns: a page that renders twenty rows, each asking about the same token
 * account, issues twenty identical requests. De-duplicating in-flight calls
 * collapses those to one; the short TTL collapses the ones that arrive just
 * after it resolves.
 *
 * The TTL is deliberately small. This is a freshness window, not a store —
 * the explorer shows a live chain, and the point is to absorb bursts within a
 * render pass, not to serve old answers to a user who navigated back.
 *
 * No React or DOM here, so the eviction and de-duplication rules are testable
 * directly (#63).
 */

export const DEFAULT_TTL_MS = 2000;

/**
 * Cache identity for one query.
 *
 * The network is part of the key: the same account URL on mainnet and on a
 * testnet are different records, and switching networks must not show the
 * previous one's answer.
 */
export function queryKey(
  network: string,
  scope: unknown,
  query?: unknown,
): string {
  return `${network}|${scope}|${query === undefined ? '' : JSON.stringify(query)}`;
}

interface Entry {
  value: unknown;
  at: number;
}

export class QueryCache {
  readonly #inflight = new Map<string, Promise<unknown>>();
  readonly #settled = new Map<string, Entry>();
  readonly #ttl: number;
  readonly #now: () => number;

  constructor(ttl: number = DEFAULT_TTL_MS, now: () => number = Date.now) {
    this.#ttl = ttl;
    this.#now = now;
  }

  /**
   * Run `load`, or join the call already running for this key, or return a
   * result still inside the freshness window.
   */
  fetch<T>(key: string, load: () => Promise<T>): Promise<T> {
    const fresh = this.#settled.get(key);
    if (fresh && this.#now() - fresh.at < this.#ttl) {
      return Promise.resolve(fresh.value as T);
    }
    // Expired: drop it rather than leave it to accumulate.
    if (fresh) {
      this.#settled.delete(key);
    }

    const running = this.#inflight.get(key);
    if (running) {
      return running as Promise<T>;
    }

    const p = load().then(
      (value) => {
        this.#inflight.delete(key);
        this.#settled.set(key, { value, at: this.#now() });
        return value;
      },
      (err) => {
        // Failures are never cached — a transient network error must not be
        // replayed to every caller for the rest of the window.
        this.#inflight.delete(key);
        throw err;
      },
    );
    this.#inflight.set(key, p);
    return p;
  }

  /** Drop one key, or everything. Settled entries only — a call already in
   * flight keeps running for whoever is awaiting it. */
  invalidate(key?: string): void {
    if (key === undefined) {
      this.#settled.clear();
    } else {
      this.#settled.delete(key);
    }
  }

  /** Cached (settled) entries. For tests and diagnostics. */
  get size(): number {
    return this.#settled.size;
  }

  /** Calls currently in flight. For tests and diagnostics. */
  get pending(): number {
    return this.#inflight.size;
  }
}

/** The cache the app runs on. */
export const queryCache = new QueryCache();
