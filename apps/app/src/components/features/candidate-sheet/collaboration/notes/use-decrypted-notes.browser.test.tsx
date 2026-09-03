import type { EncryptedEnvelope } from '@comitium/crypto';
import type { WrappedKey } from '@comitium/schemas/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import type { ActivityFeedRow } from '@/lib/schemas/emails';
import { useDecryptedNotes } from './use-decrypted-notes';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const mocks = vi.hoisted(() => ({
  activityData: undefined as { data: ActivityFeedRow[] } | undefined,
  decryptApplication: vi.fn(),
  isCryptoActive: true,
  isVaultKeyError: false,
  isVaultKeyLoading: false,
  notes: [] as Array<{ id: string; content: EncryptedEnvelope }>,
  wrappedVaultKey: { ek: 'wrapped-vault-key' } as WrappedKey | undefined,
}));

vi.mock('@comitium/auth/use-is-crypto-active', () => ({
  useIsCryptoActive: () => mocks.isCryptoActive,
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: { decryptApplication: mocks.decryptApplication },
}));

vi.mock('@comitium/ui/logger', () => ({
  logger: { warn: vi.fn() },
}));

vi.mock('@/hooks/queries/use-query-candidate-activity', () => ({
  useQueryCandidateActivity: () => ({ data: mocks.activityData }),
}));

vi.mock('@/hooks/queries/use-query-candidate-notes', () => ({
  useQueryCandidateNotes: () => ({ notes: mocks.notes, total: mocks.notes.length }),
}));

vi.mock('@/hooks/queries/use-query-wrapped-vault-key', () => ({
  useQueryWrappedVaultKey: () => ({
    data: mocks.wrappedVaultKey,
    isError: mocks.isVaultKeyError,
    isLoading: mocks.isVaultKeyLoading,
  }),
}));

const noteDoc = (text: string) => ({
  type: 'doc' as const,
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function envelope(ciphertext: string): EncryptedEnvelope {
  return { ct: ciphertext } as EncryptedEnvelope;
}

function noteActivity(noteId: string, content: EncryptedEnvelope): ActivityFeedRow {
  return {
    id: `activity-${noteId}`,
    type: 'note_added',
    createdAt: '2026-08-28T08:00:00.000Z',
    scope: 'candidate',
    applicationId: null,
    jobId: null,
    jobTitle: null,
    actor: { userId: null, externalWallet: null, name: 'Recruiter' },
    metadata: {},
    payload: { kind: 'note', noteId, content, isPrivate: false },
  } as ActivityFeedRow;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.activityData = undefined;
  mocks.isCryptoActive = true;
  mocks.isVaultKeyError = false;
  mocks.isVaultKeyLoading = false;
  mocks.notes = [];
  mocks.wrappedVaultKey = { ek: 'wrapped-vault-key' } as WrappedKey;
});

describe('useDecryptedNotes', () => {
  it('does not expose a note decrypted for the previous candidate', async () => {
    const previous = deferred<unknown>();
    const current = deferred<unknown>();
    mocks.notes = [{ id: 'note-1', content: envelope('previous') }];
    mocks.decryptApplication.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    const hook = await renderHook(
      (props?: { candidateId: string }) => useDecryptedNotes('application-1', 'org-1', props?.candidateId ?? null),
      { initialProps: { candidateId: 'candidate-1' } },
    );

    await vi.waitFor(() => expect(mocks.decryptApplication).toHaveBeenCalledTimes(1));
    mocks.notes = [{ id: 'note-1', content: envelope('current') }];
    await hook.rerender({ candidateId: 'candidate-2' });
    await vi.waitFor(() => expect(mocks.decryptApplication).toHaveBeenCalledTimes(2));

    current.resolve(noteDoc('Current'));
    await vi.waitFor(() => expect(hook.result.current.decryptedNotes['note-1']).toEqual(noteDoc('Current')));

    previous.resolve(noteDoc('Stale'));
    await Promise.resolve();
    await Promise.resolve();

    expect(hook.result.current.decryptedNotes['note-1']).toEqual(noteDoc('Current'));
  });

  it('decrypts one note once when it appears in both notes and activity queries', async () => {
    const content = envelope('shared');
    mocks.notes = [{ id: 'note-1', content }];
    mocks.activityData = { data: [noteActivity('note-1', content)] };
    mocks.decryptApplication.mockResolvedValue(noteDoc('Shared'));
    const hook = await renderHook(() => useDecryptedNotes('application-1', 'org-1', 'candidate-1'));

    await vi.waitFor(() => expect(hook.result.current.decryptedNotes['note-1']).toEqual(noteDoc('Shared')));

    expect(mocks.decryptApplication).toHaveBeenCalledExactlyOnceWith(
      content,
      'org-1',
      mocks.wrappedVaultKey,
      expect.objectContaining({ orgId: 'org-1', subjectId: 'candidate-1' }),
    );
  });

  it('records a failed note without retrying it on rerender', async () => {
    mocks.notes = [{ id: 'note-1', content: envelope('invalid') }];
    mocks.decryptApplication.mockRejectedValue(new Error('bad key'));
    const hook = await renderHook(() => useDecryptedNotes('application-1', 'org-1', 'candidate-1'));

    await vi.waitFor(() => expect(hook.result.current.failedNoteIds.has('note-1')).toBe(true));
    await hook.rerender();
    await Promise.resolve();

    expect(mocks.decryptApplication).toHaveBeenCalledTimes(1);
    expect(hook.result.current.decryptingNoteIds.has('note-1')).toBe(false);
  });
});
