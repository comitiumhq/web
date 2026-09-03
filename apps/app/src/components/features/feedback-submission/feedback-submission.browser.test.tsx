import type { PublicEncryptionKey } from '@comitium/crypto';
import type { FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';

const mocks = vi.hoisted(() => ({
  createSubmission: vi.fn(),
  encryptApplication: vi.fn(),
  ensureUnlocked: vi.fn(),
  flow: null as object | null,
  toastError: vi.fn(),
  updateSubmission: vi.fn(),
}));

vi.mock('@comitium/auth/use-crypto-unlock', () => ({
  useCryptoUnlock: () => ({ ensureUnlocked: mocks.ensureUnlocked }),
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: { encryptApplication: mocks.encryptApplication },
}));

vi.mock('@/hooks/mutations/use-feedback-submission', () => ({
  useCreateFeedbackSubmission: () => ({ mutate: mocks.createSubmission, isPending: false }),
  useUpdateFeedbackSubmission: () => ({ mutate: mocks.updateSubmission, isPending: false }),
}));

vi.mock('./use-feedback-submission-flow', () => ({
  getFeedbackSubmissionSourceBody: (source: { kind: 'activity'; activity: { id: string } } | { eventId: string }) =>
    'activity' in source ? { activityId: source.activity.id } : { interviewEventId: source.eventId },
  useFeedbackSubmissionFlow: () => mocks.flow,
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError },
}));

import { FeedbackSubmissionPanel, type FeedbackSubmissionSource } from './index';
import type { FeedbackSubmissionFlowResult } from './use-feedback-submission-flow';

const APPLICATION_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const FORM_ID = '33333333-3333-4333-8333-333333333333';
const SECTION_ID = '44444444-4444-4444-8444-444444444444';
const PUBLIC_QUESTION_ID = '55555555-5555-4555-8555-555555555555';
const PRIVATE_QUESTION_ID = '66666666-6666-4666-8666-666666666666';
const SUBMISSION_ID = '77777777-7777-4777-8777-777777777777';
const ACTIVITY_ID = '88888888-8888-4888-8888-888888888888';

const vaultPublicKey = { v: 1, xwing: 'vault-key' } as PublicEncryptionKey;

const snapshot: FormDefinitionSnapshot = {
  v: 1,
  formId: FORM_ID,
  formClass: 'feedback',
  title: 'Interview feedback',
  capturedAt: '2026-08-28T00:00:00.000Z',
  sections: [
    {
      id: SECTION_ID,
      position: 0,
      title: '',
      questions: [
        {
          id: PUBLIC_QUESTION_ID,
          position: 0,
          questionType: 'short_answer',
          prompt: 'Public note',
          description: null,
          isRequired: true,
          isPrivate: false,
          selectableValues: null,
          config: null,
          visibility: 'standard',
          reusableField: null,
        },
        {
          id: PRIVATE_QUESTION_ID,
          position: 1,
          questionType: 'short_answer',
          prompt: 'Private note',
          description: null,
          isRequired: true,
          isPrivate: true,
          selectableValues: null,
          config: null,
          visibility: 'private',
          reusableField: null,
        },
      ],
    },
  ],
};

const source: FeedbackSubmissionSource = {
  kind: 'activity',
  stageName: 'Interview',
  activity: {
    id: ACTIVITY_ID,
    feedbackFormTitle: 'Interview feedback',
  } as ApplicationReviewActivity,
};

function flow(overrides: Partial<FeedbackSubmissionFlowResult> = {}): FeedbackSubmissionFlowResult {
  return {
    isLoading: false,
    error: null,
    snapshot,
    defaultValues: {
      [PUBLIC_QUESTION_ID]: '',
      [PRIVATE_QUESTION_ID]: '',
    },
    mode: 'create',
    formId: FORM_ID,
    previousSubmissionId: null,
    ...overrides,
  };
}

function Harness({ publicKey = vaultPublicKey }: { publicKey?: PublicEncryptionKey | null }) {
  return (
    <FeedbackSubmissionPanel
      active
      applicationId={APPLICATION_ID}
      orgId={ORG_ID}
      source={source}
      currentUserId="user-1"
      vaultPublicKey={publicKey}
      vaultKeyVersion={3}
      wrappedVaultKey={undefined}
      onComplete={() => undefined}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.flow = flow();
  mocks.ensureUnlocked.mockResolvedValue(undefined);
  mocks.encryptApplication
    .mockResolvedValueOnce({ ct: 'standard-ciphertext' })
    .mockResolvedValueOnce({ ct: 'private-ciphertext' });
});

describe('FeedbackSubmissionPanel', () => {
  it('encrypts public and private answers separately before creating feedback', async () => {
    const screen = await render(<Harness />);

    await screen.getByRole('textbox').nth(0).fill('Share with the team');
    await screen.getByRole('textbox').nth(1).fill('Restricted note');
    await screen.getByRole('button', { name: 'Submit feedback' }).click();

    await vi.waitFor(() => expect(mocks.createSubmission).toHaveBeenCalledTimes(1));
    expect(mocks.ensureUnlocked).toHaveBeenCalledOnce();
    expect(mocks.encryptApplication).toHaveBeenCalledTimes(2);
    expect(mocks.encryptApplication.mock.calls.map((call) => call[2])).toEqual([
      { [PUBLIC_QUESTION_ID]: 'Share with the team' },
      { [PRIVATE_QUESTION_ID]: 'Restricted note' },
    ]);
    expect(mocks.createSubmission).toHaveBeenCalledExactlyOnceWith(
      {
        applicationId: APPLICATION_ID,
        body: {
          activityId: ACTIVITY_ID,
          formId: FORM_ID,
          answerEnvelopes: [
            { visibility: 'standard', answers: { ct: 'standard-ciphertext' } },
            { visibility: 'private', answers: { ct: 'private-ciphertext' } },
          ],
          fieldValues: [],
        },
      },
      { onSuccess: expect.any(Function) },
    );
    expect(mocks.updateSubmission).not.toHaveBeenCalled();
  });

  it('updates the existing submission without creating a second record', async () => {
    mocks.flow = flow({
      mode: 'edit',
      previousSubmissionId: SUBMISSION_ID,
      defaultValues: {
        [PUBLIC_QUESTION_ID]: 'Existing public note',
        [PRIVATE_QUESTION_ID]: 'Existing private note',
      },
    });
    const screen = await render(<Harness />);

    await screen.getByRole('button', { name: 'Save changes' }).click();

    await vi.waitFor(() => expect(mocks.updateSubmission).toHaveBeenCalledTimes(1));
    expect(mocks.updateSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: APPLICATION_ID, submissionId: SUBMISSION_ID }),
      { onSuccess: expect.any(Function) },
    );
    expect(mocks.createSubmission).not.toHaveBeenCalled();
  });

  it('fails closed when answer encryption fails', async () => {
    mocks.encryptApplication.mockReset();
    mocks.encryptApplication.mockRejectedValue(new Error('encryption failed'));
    const screen = await render(<Harness />);

    await screen.getByRole('textbox').nth(0).fill('Share with the team');
    await screen.getByRole('textbox').nth(1).fill('Restricted note');
    await screen.getByRole('button', { name: 'Submit feedback' }).click();

    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('encryption failed'));
    expect(mocks.createSubmission).not.toHaveBeenCalled();
    expect(mocks.updateSubmission).not.toHaveBeenCalled();
  });

  it('does not allow submission before the vault key is available', async () => {
    const screen = await render(<Harness publicKey={null} />);

    await expect.element(screen.getByRole('button', { name: 'Submit feedback' })).toBeDisabled();
    expect(mocks.ensureUnlocked).not.toHaveBeenCalled();
    expect(mocks.encryptApplication).not.toHaveBeenCalled();
  });
});
