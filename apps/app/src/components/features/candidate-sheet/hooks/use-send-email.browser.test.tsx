import type { PublicEncryptionKey } from '@comitium/crypto';
import type { ApplicationApiResponse } from '@comitium/schemas/applications';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useSendEmail } from './use-send-email';

const mocks = vi.hoisted(() => ({
  assertEncryptionKeyBundle: vi.fn(),
  getRecipientKey: vi.fn(),
  sendEmailMutation: vi.fn(),
  toastError: vi.fn(),
  user: { id: 'user-id' } as object | null,
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => ({ user: mocks.user }),
}));

vi.mock('@comitium/crypto/key-bundle', () => ({
  assertEncryptionKeyBundle: mocks.assertEncryptionKeyBundle,
}));

vi.mock('@/hooks/mutations/use-send-email-mutation', () => ({
  useSendEmailMutation: () => ({ mutate: mocks.sendEmailMutation, isPending: false }),
}));

vi.mock('@/lib/api/applications-data', () => ({
  getRecipientKey: mocks.getRecipientKey,
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError },
}));

const application = { id: '11111111-1111-4111-8111-111111111111' } as ApplicationApiResponse;
const vaultPublicKey = { v: 1, xwing: 'vault-key' } as PublicEncryptionKey;
const emailData = {
  subject: 'Application update',
  messageDoc: { type: 'doc' as const, content: [] },
  messageHtml: '<p>Application update</p>',
  emailTemplateId: undefined,
};

interface HarnessProps {
  applicantEmail?: string | null;
  publicKey?: PublicEncryptionKey | null;
  keyVersion?: number | null;
  onError?: () => void;
  onSuccess?: () => void;
}

function Harness({
  applicantEmail = 'candidate@example.com',
  publicKey = vaultPublicKey,
  keyVersion = 2,
  onError,
  onSuccess,
}: HarnessProps) {
  const { sendEmail, isSending } = useSendEmail({
    application,
    orgId: '22222222-2222-4222-8222-222222222222',
    jobId: '33333333-3333-4333-8333-333333333333',
    vaultPublicKey: publicKey,
    vaultKeyVersion: keyVersion,
    applicantEmail,
  });
  const send = () => sendEmail({ ...emailData, onError, onSuccess });

  return (
    <main>
      <p>{isSending ? 'Sending' : 'Idle'}</p>
      <button type="button" onClick={() => void send()}>
        Send
      </button>
      <button
        type="button"
        onClick={() => {
          void send();
          void send();
        }}
      >
        Send twice
      </button>
    </main>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertEncryptionKeyBundle.mockReturnValue(undefined);
  mocks.getRecipientKey.mockResolvedValue({ publicKey: { v: 1, xwing: 'candidate-key' } });
  mocks.user = { id: 'user-id' };
});

describe('useSendEmail', () => {
  it('fails closed before recipient lookup when vault access is unavailable', async () => {
    const onError = vi.fn();
    const screen = await render(<Harness publicKey={null} onError={onError} />);

    await screen.getByRole('button', { name: 'Send', exact: true }).click();

    expect(mocks.toastError).toHaveBeenCalledWith('Vault key not available');
    expect(onError).toHaveBeenCalledOnce();
    expect(mocks.getRecipientKey).not.toHaveBeenCalled();
    expect(mocks.sendEmailMutation).not.toHaveBeenCalled();
  });

  it('fails closed when the secure user session is incomplete', async () => {
    mocks.assertEncryptionKeyBundle.mockImplementation(() => {
      throw new Error('Encryption key bundle is incomplete');
    });
    const onError = vi.fn();
    const screen = await render(<Harness onError={onError} />);

    await screen.getByRole('button', { name: 'Send', exact: true }).click();

    expect(mocks.toastError).toHaveBeenCalledWith('Encryption key bundle is incomplete');
    expect(onError).toHaveBeenCalledOnce();
    expect(mocks.getRecipientKey).not.toHaveBeenCalled();
    expect(mocks.sendEmailMutation).not.toHaveBeenCalled();
  });

  it('does not start two recipient lookups for one in-flight send', async () => {
    let resolveRecipient: (value: { publicKey: PublicEncryptionKey }) => void = () => undefined;
    mocks.getRecipientKey.mockReturnValue(
      new Promise((resolve) => {
        resolveRecipient = resolve;
      }),
    );
    const screen = await render(<Harness />);

    await screen.getByRole('button', { name: 'Send twice' }).click();

    expect(mocks.getRecipientKey).toHaveBeenCalledTimes(1);
    resolveRecipient({ publicKey: { v: 1, xwing: 'candidate-key' } as PublicEncryptionKey });
    await vi.waitFor(() => expect(mocks.sendEmailMutation).toHaveBeenCalledTimes(1));
  });

  it('keeps the processing state until the mutation callback completes', async () => {
    const onSuccess = vi.fn();
    const screen = await render(<Harness onSuccess={onSuccess} />);

    await screen.getByRole('button', { name: 'Send', exact: true }).click();
    await expect.element(screen.getByText('Sending')).toBeInTheDocument();
    expect(mocks.sendEmailMutation).toHaveBeenCalledTimes(1);

    const callbacks = mocks.sendEmailMutation.mock.calls[0][1] as { onSuccess: () => void };
    callbacks.onSuccess();

    await expect.element(screen.getByText('Idle')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
