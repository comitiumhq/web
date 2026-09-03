import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const API_URL = 'https://api.comitium.test/v1';
vi.stubEnv('VITE_API', API_URL);

const { api, registerApiAuthTokenProvider } = await import('./client');
let unregisterTokenProvider: (() => void) | null = null;

afterEach(() => {
  unregisterTokenProvider?.();
  unregisterTokenProvider = null;
  vi.unstubAllGlobals();
});

afterAll(() => vi.unstubAllEnvs());

describe('site API credential transport', () => {
  it("omits credentials and Privy headers when auth is 'none'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const tokenProvider = vi.fn().mockResolvedValue({ accessToken: 'access', identityToken: 'identity' });
    unregisterTokenProvider = registerApiAuthTokenProvider(tokenProvider);

    await api.get('/jobs', z.object({ ok: z.boolean() }), { auth: 'none' });

    expect(tokenProvider).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${API_URL}/jobs`,
      expect.objectContaining({
        credentials: 'omit',
        headers: expect.any(Headers),
      }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
    expect(headers.has('privy-id-token')).toBe(false);
  });

  it('preserves credentialed Privy transport for candidate requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    unregisterTokenProvider = registerApiAuthTokenProvider(async () => ({
      accessToken: 'access',
      identityToken: 'identity',
    }));

    await api.post('/applications/prepare', { postingId: 'posting' }, z.object({ ok: z.boolean() }));

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${API_URL}/applications/prepare`,
      expect.objectContaining({
        credentials: 'include',
        headers: expect.any(Headers),
      }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access');
    expect(headers.get('privy-id-token')).toBe('identity');
  });
});
