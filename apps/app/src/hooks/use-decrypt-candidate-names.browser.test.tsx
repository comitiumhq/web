import type { CandidateProfile } from '@comitium/schemas/candidates';
import type { EncryptedEnvelope } from '@comitium/schemas/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useDecryptCandidateNames } from './use-decrypt-candidate-names';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const mocks = vi.hoisted(() => ({
  decryptApplication: vi.fn(),
  isCryptoActive: true,
  wrappedVaultKey: { ek: 'wrapped-vault-key' },
}));

vi.mock('@comitium/auth/use-is-crypto-active', () => ({
  useIsCryptoActive: () => mocks.isCryptoActive,
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: {
    decryptApplication: mocks.decryptApplication,
    isActive: () => mocks.isCryptoActive,
  },
}));

vi.mock('./queries/use-query-wrapped-vault-key', () => ({
  useQueryWrappedVaultKey: () => ({ data: mocks.wrappedVaultKey }),
}));

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function profile(firstName: string): CandidateProfile {
  return {
    firstName,
    lastName: 'Candidate',
    email: null,
    phone: null,
    linkedIn: null,
    github: null,
    website: null,
    location: null,
    currentTitle: null,
    currentCompany: null,
  };
}

function envelope(ciphertext: string): EncryptedEnvelope {
  return { ct: ciphertext } as EncryptedEnvelope;
}

function application(candidateId: string, ciphertext: string) {
  return { candidateId, candidateProfile: envelope(ciphertext) };
}

beforeEach(() => {
  mocks.decryptApplication.mockReset();
  mocks.isCryptoActive = true;
  mocks.wrappedVaultKey = { ek: 'wrapped-vault-key' };
});

describe('useDecryptCandidateNames', () => {
  it('ignores an old organization decrypt that finishes after the route changes', async () => {
    const orgA = deferred<unknown>();
    const orgB = deferred<unknown>();
    mocks.decryptApplication.mockReturnValueOnce(orgA.promise).mockReturnValueOnce(orgB.promise);
    const hook = await renderHook(
      (props?: { applications: ReturnType<typeof application>[]; orgId: string }) => {
        if (!props) {
          throw new Error('Hook props are required');
        }

        return useDecryptCandidateNames(props.applications, props.orgId);
      },
      {
        initialProps: {
          applications: [application('candidate-1', 'ciphertext-a')],
          orgId: 'org-a',
        },
      },
    );

    await vi.waitFor(() => expect(mocks.decryptApplication).toHaveBeenCalledTimes(1));
    await hook.rerender({
      applications: [application('candidate-1', 'ciphertext-b')],
      orgId: 'org-b',
    });
    await vi.waitFor(() => expect(mocks.decryptApplication).toHaveBeenCalledTimes(2));

    orgB.resolve(profile('Current'));
    await vi.waitFor(() => expect(hook.result.current.get('candidate-1')?.firstName).toBe('Current'));

    orgA.resolve(profile('Stale'));
    await Promise.resolve();
    await Promise.resolve();

    expect(hook.result.current.get('candidate-1')?.firstName).toBe('Current');
  });

  it('decrypts a new ciphertext instead of reusing a cached profile for the same candidate', async () => {
    mocks.decryptApplication.mockResolvedValueOnce(profile('First')).mockResolvedValueOnce(profile('Updated'));
    const hook = await renderHook(
      (props?: { applications: ReturnType<typeof application>[] }) => {
        if (!props) {
          throw new Error('Hook props are required');
        }

        return useDecryptCandidateNames(props.applications, 'org-cache');
      },
      { initialProps: { applications: [application('candidate-cache', 'ciphertext-1')] } },
    );

    await vi.waitFor(() => expect(hook.result.current.get('candidate-cache')?.firstName).toBe('First'));
    await hook.rerender({ applications: [application('candidate-cache', 'ciphertext-2')] });

    await vi.waitFor(() => expect(hook.result.current.get('candidate-cache')?.firstName).toBe('Updated'));
    expect(mocks.decryptApplication).toHaveBeenCalledTimes(2);
  });

  it('clears decrypted names when the crypto session is no longer active', async () => {
    mocks.decryptApplication.mockResolvedValue(profile('Visible'));
    const hook = await renderHook(() =>
      useDecryptCandidateNames([application('candidate-clear', 'ciphertext')], 'org-clear'),
    );
    await vi.waitFor(() => expect(hook.result.current.get('candidate-clear')?.firstName).toBe('Visible'));

    mocks.isCryptoActive = false;
    await hook.rerender();

    await vi.waitFor(() => expect(hook.result.current.size).toBe(0));
  });
});
