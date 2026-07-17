/**
 * Local-wallet integration mode.
 *
 * When the Explorer is built with `VITE_WALLET=local` (see the wallet repo's
 * `make webui-explorer`) it is served by `ccli webui` from the same origin as
 * the wallet JSON-RPC API. In that mode the wallet panel is enabled and talks
 * to a relative `/v1` endpoint; the production build leaves it disabled.
 */

export const walletMode: 'local' | 'off' =
  import.meta.env.VITE_WALLET === 'local' ? 'local' : 'off';

export const isLocalWallet = walletMode === 'local';

/**
 * Base path for the wallet JSON-RPC API. Always same-origin: the release build
 * is served by the daemon, and the dev server proxies `/v1` to it (see
 * vite.config.js). Kept as a function so callers don't hard-code the string.
 */
export function walletApiBase(): string {
  return '/v1';
}

/**
 * Fetch the per-run session token the daemon requires on `/v1` requests.
 * Same-origin only; returns null if the daemon is unreachable or the token
 * endpoint is blocked (e.g. the app is not served by the daemon).
 */
export async function fetchWalletSessionToken(): Promise<string | null> {
  try {
    const res = await fetch(`${walletApiBase()}/session`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string };
    return body.token ?? null;
  } catch {
    return null;
  }
}
