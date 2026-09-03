import type { PublicEncryptionKey } from '@comitium/crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useSendSchedulingLink } from './use-send-scheduling-link';

const mocks = vi.hoisted(() => ({
  createLink: vi.fn(),
  onSent: vi.fn(),
  prepareSchedulingLinkEmail: vi.fn(),
  sendLink: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/hooks/mutations/use-interview-mutations', () => ({
  useCreateDirectBookingLink: () => ({ mutateAsync: mocks.createLink, isPending: false }),
  useSendDirectBookingLink: () => ({ mutateAsync: mocks.sendLink, isPending: false }),
}));

vi.mock('@/lib/applications/communication/direct-booking-link-email', () => ({
  prepareSchedulingLinkEmail: mocks.prepareSchedulingLinkEmail,
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError },
}));

const vaultPublicKey = { v: 1, xwing: 'vault-key' } as PublicEncryptionKey;
const draft = {
  interviewId: '11111111-1111-4111-8111-111111111111',
  durationMinutes: 45,
  stageId: '22222222-2222-4222-8222-222222222222',
  timeZone: 'Europe/Warsaw',
  interviewers: [{ userId: '33333333-3333-4333-8333-333333333333', role: 'lead' as const }],
  subject: 'Choose an interview time',
  messageDoc: { type: 'doc' as const, content: [] },
  messageHtml: '<p>Choose a time</p>',
  emailTemplateId: null,
};

function Harness({ applicantEmail = 'candidate@example.com' }: { applicantEmail?: string | null }) {
  const { sendSchedulingLink, isPending } = useSendSchedulingLink({
    applicationId: '44444444-4444-4444-8444-444444444444',
    orgId: '55555555-5555-4555-8555-555555555555',
    applicantEmail,
    vaultPublicKey,
    vaultKeyVersion: 3,
    onSent: mocks.onSent,
  });

  return (
    <main>
      <p>{isPending ? 'Sending' : 'Idle'}</p>
      <button type="button" onClick={() => void sendSchedulingLink(draft)}>
        Send link
      </button>
      <button
        type="button"
        onClick={() => {
          void sendSchedulingLink(draft);
          void sendSchedulingLink(draft);
        }}
      >
        Send twice
      </button>
    </main>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createLink.mockResolvedValue({
    data: { scheduleId: '66666666-6666-4666-8666-666666666666', url: 'https://schedule.example/token' },
  });
  mocks.prepareSchedulingLinkEmail.mockResolvedValue({ encrypted: 'email-body' });
  mocks.sendLink.mockResolvedValue(undefined);
});

describe('useSendSchedulingLink', () => {
  it('fails before creating a schedule when the candidate has no email', async () => {
    const screen = await render(<Harness applicantEmail={null} />);

    await screen.getByRole('button', { name: 'Send link' }).click();

    expect(mocks.toastError).toHaveBeenCalledWith('Candidate email is required');
    expect(mocks.createLink).not.toHaveBeenCalled();
    expect(mocks.sendLink).not.toHaveBeenCalled();
  });

  it('creates, encrypts, and sends one direct booking link', async () => {
    const screen = await render(<Harness />);

    await screen.getByRole('button', { name: 'Send link' }).click();
    await vi.waitFor(() => expect(mocks.onSent).toHaveBeenCalledOnce());

    expect(mocks.createLink).toHaveBeenCalledExactlyOnceWith({
      applicationId: '44444444-4444-4444-8444-444444444444',
      body: {
        interviewId: draft.interviewId,
        durationMinutes: 45,
        stageId: draft.stageId,
        candidateEmail: 'candidate@example.com',
        timeZone: 'Europe/Warsaw',
        interviewers: draft.interviewers,
      },
    });
    expect(mocks.prepareSchedulingLinkEmail).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        schedulingUrl: 'https://schedule.example/token',
        applicantEmail: 'candidate@example.com',
      }),
    );
    expect(mocks.sendLink).toHaveBeenCalledExactlyOnceWith({
      applicationId: '44444444-4444-4444-8444-444444444444',
      scheduleId: '66666666-6666-4666-8666-666666666666',
      body: { encrypted: 'email-body' },
    });
  });

  it('reuses the pending link after a send failure instead of creating another schedule', async () => {
    mocks.sendLink.mockRejectedValueOnce(new Error('delivery failed')).mockResolvedValueOnce(undefined);
    const screen = await render(<Harness />);

    await screen.getByRole('button', { name: 'Send link' }).click();
    await expect.element(screen.getByText('Idle')).toBeInTheDocument();
    await screen.getByRole('button', { name: 'Send link' }).click();
    await vi.waitFor(() => expect(mocks.onSent).toHaveBeenCalledOnce());

    expect(mocks.createLink).toHaveBeenCalledTimes(1);
    expect(mocks.sendLink).toHaveBeenCalledTimes(2);
  });

  it('does not create duplicate schedules for concurrent submissions', async () => {
    let resolveCreate: (value: { data: { scheduleId: string; url: string } }) => void = () => undefined;
    mocks.createLink.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const screen = await render(<Harness />);

    await screen.getByRole('button', { name: 'Send twice' }).click();

    expect(mocks.createLink).toHaveBeenCalledTimes(1);
    resolveCreate({
      data: { scheduleId: '66666666-6666-4666-8666-666666666666', url: 'https://schedule.example/token' },
    });
    await vi.waitFor(() => expect(mocks.sendLink).toHaveBeenCalledTimes(1));
  });
});
