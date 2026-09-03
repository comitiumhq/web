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
});
