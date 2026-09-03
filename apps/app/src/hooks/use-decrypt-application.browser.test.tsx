import type { WrappedKey } from '@comitium/schemas/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import type { AnswerBucket } from '@/lib/forms/decrypt-answers';
import { useDecryptApplication } from './use-decrypt-application';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const mocks = vi.hoisted(() => ({
  canUnlock: true,
  decryptAnswerBuckets: vi.fn(),
  ensureUnlocked: vi.fn(),
  isCryptoActive: true,
}));

vi.mock('@comitium/auth/use-crypto-unlock', () => ({
  useCryptoUnlock: () => ({
    canUnlock: mocks.canUnlock,
    ensureUnlocked: mocks.ensureUnlocked,
    isCryptoActive: mocks.isCryptoActive,
  }),
}));

vi.mock('@/lib/forms/decrypt-answers', () => ({
  decryptAnswerBuckets: mocks.decryptAnswerBuckets,
}));

const wrappedVaultKey = { ek: 'wrapped-vault-key' } as WrappedKey;
const answers = [{ visibility: 'standard', answers: { ct: 'ciphertext' } }] as AnswerBucket[];

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

beforeEach(() => {
  mocks.canUnlock = true;
  mocks.decryptAnswerBuckets.mockReset();
  mocks.ensureUnlocked.mockReset();
  mocks.ensureUnlocked.mockResolvedValue(undefined);
  mocks.isCryptoActive = true;
});

describe('useDecryptApplication', () => {
  it('ignores decrypted answers from a previous submission after the identity changes', async () => {
    const first = deferred<Record<string, unknown>>();
    const second = deferred<Record<string, unknown>>();
    mocks.decryptAnswerBuckets.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const hook = await renderHook(
      (props?: { submissionId: string | null }) =>
        useDecryptApplication('org-1', props?.submissionId ?? null, 'form-1', answers, wrappedVaultKey),
      { initialProps: { submissionId: 'submission-1' as string | null } },
    );

    await vi.waitFor(() => expect(mocks.decryptAnswerBuckets).toHaveBeenCalledTimes(1));
    await hook.rerender({ submissionId: 'submission-2' });
    await vi.waitFor(() => expect(mocks.decryptAnswerBuckets).toHaveBeenCalledTimes(2));

    second.resolve({ answer: 'current' });
    await vi.waitFor(() => expect(hook.result.current.data).toEqual({ answer: 'current' }));

    first.resolve({ answer: 'stale' });
    await Promise.resolve();
    await Promise.resolve();

    expect(hook.result.current.data).toEqual({ answer: 'current' });
  });

  it('keeps a failed decrypt retryable and clears the error after success', async () => {
    mocks.decryptAnswerBuckets.mockRejectedValueOnce(new Error('bad key')).mockResolvedValueOnce({ answer: 'ok' });
    const hook = await renderHook(() =>
      useDecryptApplication('org-1', 'submission-1', 'form-1', answers, wrappedVaultKey),
    );

    await vi.waitFor(() => expect(hook.result.current.error).toBe('Failed to decrypt data. Please try again.'));

    await hook.result.current.retry();

    await vi.waitFor(() => expect(hook.result.current.data).toEqual({ answer: 'ok' }));
    expect(hook.result.current.error).toBeNull();
    expect(mocks.ensureUnlocked).toHaveBeenCalledTimes(2);
  });
});
