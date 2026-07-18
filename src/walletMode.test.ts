import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchWalletSessionToken, walletApiBase } from './walletMode';

describe('walletMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the same-origin /v1 base', () => {
    expect(walletApiBase()).toBe('/v1');
  });

  it('fetches the session token from /v1/session', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ token: 'abc123' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const token = await fetchWalletSessionToken();
    expect(token).toBe('abc123');
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/session',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('returns null when the session endpoint is blocked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 })),
    );
    expect(await fetchWalletSessionToken()).toBeNull();
  });

  it('returns null when the daemon is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('connection refused')),
    );
    expect(await fetchWalletSessionToken()).toBeNull();
  });
});
