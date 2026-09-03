import type { EncryptedEnvelope } from '@comitium/crypto';
import type { WrappedKey } from '@comitium/schemas/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import type { DecryptedEmailContent, EmailResponse } from '@/lib/schemas/emails';
import { useDecryptEmails } from './use-decrypt-emails';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const mocks = vi.hoisted(() => ({
  canUnlock: true,
  decryptAsApplicant: vi.fn(),
  decryptAsOrg: vi.fn(),
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

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: {
    decryptEmailContentForApplicant: mocks.decryptAsApplicant,
    decryptEmailContentForOrganization: mocks.decryptAsOrg,
  },
}));

const wrappedVaultKey = { ek: 'wrapped-vault-key' } as WrappedKey;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function encryptedEmail(id: string, ciphertext: string): EmailResponse {
  return {
    id,
    senderRole: 'org_member',
    senderName: 'Recruiter',
    content: { ct: ciphertext } as EncryptedEnvelope,
    createdAt: '2026-08-28T08:00:00.000Z',
  };
}

function decryptedEmail(subject: string): DecryptedEmailContent {
  return {
    subject,
    to: 'candidate@example.com',
    body: { type: 'doc', content: [] },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canUnlock = true;
  mocks.ensureUnlocked.mockResolvedValue(undefined);
  mocks.isCryptoActive = true;
});

describe('useDecryptEmails', () => {
  it('ignores a previous application decrypt that finishes after navigation', async () => {
    const first = deferred<DecryptedEmailContent>();
    const second = deferred<DecryptedEmailContent>();
    mocks.decryptAsOrg.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const hook = await renderHook(
      (props?: { applicationId: string; emails: EmailResponse[] }) => {
        if (!props) {
          throw new Error('Hook props are required');
        }

        return useDecryptEmails('org-1', props.applicationId, props.emails, true, wrappedVaultKey);
      },
      {
        initialProps: {
          applicationId: 'application-1',
          emails: [encryptedEmail('email-1', 'old')],
        },
      },
    );

    await vi.waitFor(() => expect(mocks.decryptAsOrg).toHaveBeenCalledTimes(1));
    await hook.rerender({
      applicationId: 'application-2',
      emails: [encryptedEmail('email-2', 'current')],
    });
    await vi.waitFor(() => expect(mocks.decryptAsOrg).toHaveBeenCalledTimes(2));

    second.resolve(decryptedEmail('Current'));
    await vi.waitFor(() => expect(hook.result.current.data?.[0]?.content.subject).toBe('Current'));

    first.resolve(decryptedEmail('Stale'));
    await Promise.resolve();
    await Promise.resolve();

    expect(hook.result.current.data?.[0]?.content.subject).toBe('Current');
  });

  it('does not loop after a failure and retries only when requested', async () => {
    mocks.decryptAsOrg.mockRejectedValueOnce(new Error('bad key')).mockResolvedValueOnce(decryptedEmail('Recovered'));
    const hook = await renderHook(() =>
      useDecryptEmails('org-1', 'application-1', [encryptedEmail('email-1', 'ciphertext')], true, wrappedVaultKey),
    );

    await vi.waitFor(() => expect(hook.result.current.error).toBe('Failed to decrypt emails. Please try again.'));
    await hook.rerender();
    await Promise.resolve();

    expect(mocks.decryptAsOrg).toHaveBeenCalledTimes(1);

    await hook.result.current.retry();

    await vi.waitFor(() => expect(hook.result.current.data?.[0]?.content.subject).toBe('Recovered'));
    expect(hook.result.current.error).toBeNull();
    expect(mocks.ensureUnlocked).toHaveBeenCalledTimes(2);
  });

  it('uses the organization vault path with application-bound email context', async () => {
    mocks.decryptAsOrg.mockResolvedValue(decryptedEmail('Organization'));
    const email = encryptedEmail('email-1', 'ciphertext');
    const hook = await renderHook(() => useDecryptEmails('org-1', 'application-1', [email], true, wrappedVaultKey));

    await vi.waitFor(() => expect(hook.result.current.data?.[0]?.content.subject).toBe('Organization'));

    expect(mocks.decryptAsOrg).toHaveBeenCalledExactlyOnceWith(
      email.content,
      'org-1',
      wrappedVaultKey,
      expect.objectContaining({ orgId: 'org-1', subjectId: 'application-1' }),
    );
    expect(mocks.decryptAsApplicant).not.toHaveBeenCalled();
  });

  it('uses the applicant path without requiring an organization vault key', async () => {
    mocks.decryptAsApplicant.mockResolvedValue(decryptedEmail('Applicant'));
    const email = encryptedEmail('email-1', 'ciphertext');
    const hook = await renderHook(() => useDecryptEmails('org-1', 'application-1', [email], false));

    await vi.waitFor(() => expect(hook.result.current.data?.[0]?.content.subject).toBe('Applicant'));

    expect(mocks.decryptAsApplicant).toHaveBeenCalledExactlyOnceWith(
      email.content,
      expect.objectContaining({ orgId: 'org-1', subjectId: 'application-1' }),
    );
    expect(mocks.decryptAsOrg).not.toHaveBeenCalled();
  });
});
