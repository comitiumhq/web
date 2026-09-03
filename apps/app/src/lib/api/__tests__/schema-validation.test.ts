import { createAuthAccountApi } from '@comitium/auth/account-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteNote } from '@/lib/api/candidates';
import { api } from '@/lib/api/client';
import { archiveInterviewTemplate } from '@/lib/api/interview-templates';
import { updateJobTemplate } from '@/lib/api/job-templates';

const authAccountApi = createAuthAccountApi(api);

function mockJsonResponse(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API wrapper response validation', () => {
  it('accepts an empty successful command response without parsing JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })));

    await expect(
      api.post<void>('/onchain-operations/operation-id/wallet-submit', undefined, null),
    ).resolves.toBeUndefined();
  });

  it('accepts the session user shape returned by the API', async () => {
    mockJsonResponse({
      id: 'user-id',
      walletAddress: '0x0000000000000000000000000000000000000001',
      publicKey: null,
      encryptedPersonalKey: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    await expect(authAccountApi.getSession()).resolves.toMatchObject({ id: 'user-id' });
  });

  it('rejects malformed success mutations', async () => {
    mockJsonResponse({ ok: true });

    await expect(updateJobTemplate('org-id', 'template-id', { title: 'Backend Engineer' })).rejects.toThrow();
  });

  it('rejects interview template archive responses without success true', async () => {
    mockJsonResponse({ success: false });

    await expect(archiveInterviewTemplate('org-id', 'template-id')).rejects.toThrow();
  });

  it('rejects candidate note deletion responses without deleted true', async () => {
    mockJsonResponse({ success: true });

    await expect(deleteNote('candidate-id', 'note-id')).rejects.toThrow();
  });
});
