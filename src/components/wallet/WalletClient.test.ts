import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WalletAuthError, WalletClient } from './WalletClient';

// Each test drives the client with a stubbed fetch and asserts the wire
// contract (auth header, JSON-RPC envelope) and the auth/retry behavior.

function rpcResult(result: unknown) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
  });
}

function rpcError(message: string) {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -1, message } }),
    { status: 200 },
  );
}

describe('WalletClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.restoreAllMocks());

  // The first call always fetches the session token from /v1/session.
  function withToken(token = 'tok') {
    fetchMock.mockImplementationOnce(async (url: string) => {
      expect(url).toBe('/v1/session');
      return new Response(JSON.stringify({ token }), { status: 200 });
    });
  }

  it('sends the bearer token and JSON-RPC envelope', async () => {
    withToken('tok');
    fetchMock.mockImplementationOnce(
      async (_url: string, init: RequestInit) => {
        expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' });
        const body = JSON.parse(init.body as string);
        expect(body).toMatchObject({
          jsonrpc: '2.0',
          method: 'wallet.Status',
        });
        return rpcResult({
          vaults: [{ name: 'v', unlocked: true, keyCount: 2 }],
        });
      },
    );

    const client = new WalletClient();
    const status = await client.status();
    expect(status.vaults[0]).toEqual({
      name: 'v',
      unlocked: true,
      keyCount: 2,
    });
  });

  it('unwraps typed list responses', async () => {
    withToken();
    fetchMock.mockResolvedValueOnce(
      rpcResult({
        keys: [
          { label: 'k', liteAddress: 'acc://x', type: 'ed', publicKey: 'AA==' },
        ],
      }),
    );
    const keys = await new WalletClient().listKeys('v');
    expect(keys).toHaveLength(1);
    expect(keys[0].liteAddress).toBe('acc://x');
  });

  it('surfaces JSON-RPC errors as exceptions', async () => {
    withToken();
    fetchMock.mockResolvedValueOnce(rpcError('vault is locked'));
    await expect(new WalletClient().listKeys('v')).rejects.toThrow(
      'vault is locked',
    );
  });

  it('refreshes the token once on 401 and retries', async () => {
    withToken('stale');
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 })); // first call rejected
    fetchMock.mockImplementationOnce(async (url: string) => {
      expect(url).toBe('/v1/session'); // token refreshed
      return new Response(JSON.stringify({ token: 'fresh' }), { status: 200 });
    });
    fetchMock.mockImplementationOnce(
      async (_url: string, init: RequestInit) => {
        expect(init.headers).toMatchObject({ Authorization: 'Bearer fresh' });
        return rpcResult({ vaults: [] });
      },
    );

    const status = await new WalletClient().status();
    expect(status.vaults).toEqual([]);
  });

  it('throws WalletAuthError when auth keeps failing', async () => {
    withToken('stale');
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ token: 'fresh' }), { status: 200 }),
    );
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));

    await expect(new WalletClient().status()).rejects.toBeInstanceOf(
      WalletAuthError,
    );
  });

  it('throws WalletAuthError when the daemon is unreachable', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 403 })); // no token
    await expect(new WalletClient().status()).rejects.toBeInstanceOf(
      WalletAuthError,
    );
  });

  it('isConnected returns false when unreachable', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 403 }));
    expect(await new WalletClient().isConnected()).toBe(false);
  });
});
