import type { EncryptedEnvelope } from '@comitium/crypto';
import type { WrappedKey } from '@comitium/schemas/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import type { ActivityFeedRow, DecryptedEmailContent } from '@/lib/schemas/emails';
import { useDecryptedActivityEmails } from './use-decrypted-activity-emails';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const mocks = vi.hoisted(() => ({
  decryptEmailContentForOrganization: vi.fn(),
  isCryptoActive: true,
}));

vi.mock('@comitium/auth/use-is-crypto-active', () => ({
  useIsCryptoActive: () => mocks.isCryptoActive,
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: { decryptEmailContentForOrganization: mocks.decryptEmailContentForOrganization },
}));

vi.mock('@comitium/ui/logger', () => ({
  logger: { warn: vi.fn() },
}));

const wrappedVaultKey = { ek: 'wrapped-vault-key' } as WrappedKey;

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

function decryptedContent(subject: string): DecryptedEmailContent {
  return {
    subject,
    to: 'candidate@example.com',
    body: { type: 'doc', content: [] },
  };
}

function emailActivity(id: string, emailId: string, applicationId = 'application-1'): ActivityFeedRow {
  return {
    id,
    type: 'email_sent',
    createdAt: '2026-08-28T08:00:00.000Z',
    scope: 'application',
    applicationId,
    jobId: 'job-1',
    jobTitle: 'Engineer',
    actor: { userId: null, externalWallet: null, name: 'Recruiter' },
    metadata: {},
    payload: { kind: 'email', emailId, content: envelope(`${id}-ciphertext`) },
  } as ActivityFeedRow;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isCryptoActive = true;
});

describe('useDecryptedActivityEmails', () => {
  it('does not expose email content decrypted for the previous candidate', async () => {
    const previous = deferred<DecryptedEmailContent>();
    const current = deferred<DecryptedEmailContent>();
    mocks.decryptEmailContentForOrganization.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    const hook = await renderHook(
      (props?: { candidateId: string; events: ActivityFeedRow[] }) =>
        useDecryptedActivityEmails(props?.candidateId ?? null, 'org-1', props?.events ?? [], wrappedVaultKey),
      {
        initialProps: {
          candidateId: 'candidate-1',
          events: [emailActivity('event-1', 'email-1', 'application-1')],
        },
      },
    );

    await vi.waitFor(() => expect(mocks.decryptEmailContentForOrganization).toHaveBeenCalledTimes(1));
    await hook.rerender({
      candidateId: 'candidate-2',
      events: [emailActivity('event-2', 'email-1', 'application-2')],
    });
    await vi.waitFor(() => expect(mocks.decryptEmailContentForOrganization).toHaveBeenCalledTimes(2));

    current.resolve(decryptedContent('Current'));
    await vi.waitFor(() => expect(hook.result.current.decryptedEmails['email-1']?.content.subject).toBe('Current'));

    previous.resolve(decryptedContent('Stale'));
    await Promise.resolve();
    await Promise.resolve();

    expect(hook.result.current.decryptedEmails['email-1']?.content.subject).toBe('Current');
  });

  it('decrypts a repeated email id once and binds it to its application context', async () => {
    const first = emailActivity('event-1', 'email-1');
    const duplicate = emailActivity('event-2', 'email-1');
    mocks.decryptEmailContentForOrganization.mockResolvedValue(decryptedContent('Decrypted'));
    const hook = await renderHook(() =>
      useDecryptedActivityEmails('candidate-1', 'org-1', [first, duplicate], wrappedVaultKey),
    );

    await vi.waitFor(() => expect(hook.result.current.decryptedEmails['email-1']?.content.subject).toBe('Decrypted'));

    expect(mocks.decryptEmailContentForOrganization).toHaveBeenCalledExactlyOnceWith(
      first.payload.kind === 'email' ? first.payload.content : null,
      'org-1',
      wrappedVaultKey,
      expect.objectContaining({ orgId: 'org-1', subjectId: 'application-1' }),
    );
  });

  it('records a failed email without retrying it on rerender', async () => {
    mocks.decryptEmailContentForOrganization.mockRejectedValue(new Error('bad key'));
    const hook = await renderHook(() =>
      useDecryptedActivityEmails('candidate-1', 'org-1', [emailActivity('event-1', 'email-1')], wrappedVaultKey),
    );

    await vi.waitFor(() => expect(hook.result.current.failedEmailIds.has('email-1')).toBe(true));
    await hook.rerender();
    await Promise.resolve();

    expect(mocks.decryptEmailContentForOrganization).toHaveBeenCalledTimes(1);
    expect(hook.result.current.decryptingEmailIds.has('email-1')).toBe(false);
  });
});
