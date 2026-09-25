// Client side of the token registry served by metrics-service (#88).

/** One token issuer, as /v1/tokens and /v1/tokens/top return it. */
export interface RegistryToken {
  url: string;
  symbol: string;
  precision: number;
  /** Base units. */
  issued: string;
  /** Issued in whole tokens, as an exact decimal string. */
  supply: string;
  supplyLimit?: string;
  /** SupplyLimit in whole tokens, as an exact decimal string. */
  maxSupply?: string;
  properties?: string;
  partition: string;
}

export interface RegistryPage {
  total: number;
  result: RegistryToken[];
  asOf: { id: string; height: number; time: string }[];
}

export const TOP_COUNT = 10;
export const SEARCH_PAGE_SIZE = 20;

export function topTokensUrl(metrics: string, count = TOP_COUNT): string {
  return `${metrics}/tokens/top?count=${count}`;
}

/** The pattern is sent as typed; the server compiles it case-insensitively. */
export function searchTokensUrl(
  metrics: string,
  pattern: string,
  start: number,
  count = SEARCH_PAGE_SIZE,
): string {
  const q = new URLSearchParams({
    search: pattern,
    start: String(start),
    count: String(count),
  });
  return `${metrics}/tokens?${q}`;
}

/**
 * Group the whole part of an exact decimal string in thousands. Supplies are
 * strings because they exceed 2^53; converting to Number to format them
 * would round.
 */
export function formatSupply(supply: string): string {
  if (!/^-?\d+(\.\d+)?$/.test(supply)) {
    return supply;
  }
  const negative = supply.startsWith('-');
  const [whole, frac] = (negative ? supply.slice(1) : supply).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${frac ? '.' + frac : ''}`;
}

/** The server's reason for a rejected pattern, or a generic one. */
export function searchError(error: unknown): string {
  const e = error as { response?: { status?: number; data?: unknown } };
  if (e?.response?.status === 400 && typeof e.response.data === 'string') {
    return e.response.data.trim();
  }
  return 'Search failed';
}
