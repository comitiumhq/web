import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const API_URL = 'https://api.comitium.test/v1';

vi.stubEnv('VITE_API', API_URL);

const { api } = await import('./client');

afterEach(() => vi.unstubAllGlobals());
afterAll(() => vi.unstubAllEnvs());

describe('public site API transport', () => {
  it('always omits browser credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await api.get('/jobs', z.object({ ok: z.boolean() }));

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${API_URL}/jobs`,
      expect.objectContaining({ credentials: 'omit' }),
    );
  });

  it('posts JSON without credentials and returns the server acknowledgement', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const body = { email: 'founder@example.com' };
    await expect(api.post('/marketing/early-access', body, z.object({ success: z.literal(true) }))).resolves.toEqual({
      success: true,
    });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${API_URL}/marketing/early-access`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  });

  it('preserves a server rejection instead of reporting success', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Please wait' } }), { status: 429 }),
        ),
    );
    await expect(api.post('/marketing/early-access', {}, z.object({ success: z.literal(true) }))).rejects.toMatchObject(
      { status: 429, code: 'RATE_LIMITED' },
    );
  });
});
