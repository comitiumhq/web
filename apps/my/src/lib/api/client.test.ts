import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const API_URL = 'https://api.comitium.test/v1';

vi.stubEnv('VITE_API', API_URL);

const { api } = await import('./client');

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => vi.unstubAllEnvs());

describe('candidate API cookie transport', () => {
  it("omits credentials and authentication headers when auth is 'none'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await api.get('/jobs', z.object({ ok: z.boolean() }), { auth: 'none' });

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${API_URL}/jobs`,
      expect.objectContaining({
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('uses cookie credentials without bearer headers for candidate requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await api.post('/applications/prepare', { postingId: 'posting' }, z.object({ ok: z.boolean() }));

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${API_URL}/applications/prepare`,
      expect.objectContaining({
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});
