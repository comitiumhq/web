import type { WrappedKey } from '@comitium/schemas/common';
import type { FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';

const mocks = vi.hoisted(() => ({
  buildDefaultValues: vi.fn(),
  decryptFeedbackBuckets: vi.fn(),
  ensureUnlocked: vi.fn(),
  isLoadingSubmissions: false,
  resolveForm: vi.fn(),
  submissions: [] as FeedbackSubmission[],
}));

vi.mock('@comitium/auth/use-crypto-unlock', () => ({
  useCryptoUnlock: () => ({ ensureUnlocked: mocks.ensureUnlocked }),
}));

vi.mock('@/components/features/form-runtime', () => ({
  buildDefaultValues: mocks.buildDefaultValues,
}));

vi.mock('@/hooks/mutations/use-feedback-submission', () => ({
  useResolveFeedbackForm: () => ({ mutateAsync: mocks.resolveForm }),
}));

vi.mock('@/hooks/queries/use-query-feedback-submissions', () => ({
  useQueryFeedbackSubmissions: () => ({
    data: mocks.submissions,
    isLoading: mocks.isLoadingSubmissions,
  }),
}));

vi.mock('@/lib/forms/decrypt-answers', () => ({
  decryptFeedbackBuckets: mocks.decryptFeedbackBuckets,
}));

import { type FeedbackSubmissionSource, useFeedbackSubmissionFlow } from './use-feedback-submission-flow';

const APPLICATION_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const FORM_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const ACTIVITY_ID = '55555555-5555-4555-8555-555555555555';
const SUBMISSION_ID = '66666666-6666-4666-8666-666666666666';
const wrappedVaultKey = { ek: 'wrapped-key' } as WrappedKey;

function snapshot(formId = FORM_ID): FormDefinitionSnapshot {
  return {
    v: 1,
    formId,
    formClass: 'feedback',
    title: `Feedback ${formId}`,
    capturedAt: '2026-08-28T00:00:00.000Z',
    sections: [],
  };
}

function activitySource(activityId = ACTIVITY_ID): FeedbackSubmissionSource {
  return {
    kind: 'activity',
    stageName: 'Interview',
    activity: { id: activityId } as ApplicationReviewActivity,
  };
}

function previousSubmission(overrides: Partial<FeedbackSubmission> = {}): FeedbackSubmission {
  return {
    id: SUBMISSION_ID,
    formId: FORM_ID,
    activityId: ACTIVITY_ID,
    interviewEventId: null,
    submittedByUserId: USER_ID,
    isDeleted: false,
    formSnapshot: snapshot(),
    answerEnvelopes: [{ visibility: 'standard', answers: { ct: 'ciphertext' } }],
    ...overrides,
  } as FeedbackSubmission;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function renderFlow(source: FeedbackSubmissionSource, key: WrappedKey | null = wrappedVaultKey) {
  return renderHook(
    (props?: { currentSource: FeedbackSubmissionSource; wrappedKey: WrappedKey | null }) => {
      if (!props) {
        throw new Error('Hook props are required');
      }

      return useFeedbackSubmissionFlow({
        open: true,
        applicationId: APPLICATION_ID,
        orgId: ORG_ID,
        source: props.currentSource,
        currentUserId: USER_ID,
        wrappedVaultKey: props.wrappedKey ?? undefined,
      });
    },
    { initialProps: { currentSource: source, wrappedKey: key } },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.buildDefaultValues.mockReturnValue({ defaultAnswer: '' });
  mocks.decryptFeedbackBuckets.mockResolvedValue({ answer: 'decrypted' });
  mocks.ensureUnlocked.mockResolvedValue(undefined);
  mocks.isLoadingSubmissions = false;
  mocks.resolveForm.mockResolvedValue({ data: { formSnapshot: snapshot() } });
  mocks.submissions = [];
});

describe('useFeedbackSubmissionFlow', () => {
  it('resolves a new activity form and builds its defaults', async () => {
    const hook = await renderFlow(activitySource());

    await vi.waitFor(() => expect(hook.result.current.mode).toBe('create'));
    expect(mocks.resolveForm).toHaveBeenCalledExactlyOnceWith({
      applicationId: APPLICATION_ID,
      body: { activityId: ACTIVITY_ID },
    });
    expect(mocks.buildDefaultValues).toHaveBeenCalledExactlyOnceWith(snapshot());
    expect(hook.result.current).toMatchObject({
      formId: FORM_ID,
      previousSubmissionId: null,
      defaultValues: { defaultAnswer: '' },
    });
  });

  it('decrypts only the current user own matching submission for edit mode', async () => {
    mocks.submissions = [
      previousSubmission({ id: '77777777-7777-4777-8777-777777777777', submittedByUserId: 'other-user' }),
      previousSubmission({ id: '88888888-8888-4888-8888-888888888888', isDeleted: true }),
      previousSubmission(),
    ];
    const hook = await renderFlow(activitySource());

    await vi.waitFor(() => expect(hook.result.current.mode).toBe('edit'));
    expect(mocks.ensureUnlocked).toHaveBeenCalledOnce();
    expect(mocks.decryptFeedbackBuckets).toHaveBeenCalledExactlyOnceWith(
      ORG_ID,
      APPLICATION_ID,
      FORM_ID,
      mocks.submissions[2]?.answerEnvelopes,
      wrappedVaultKey,
    );
    expect(mocks.resolveForm).not.toHaveBeenCalled();
    expect(hook.result.current).toMatchObject({
      previousSubmissionId: SUBMISSION_ID,
      defaultValues: { answer: 'decrypted' },
    });
  });

  it('waits for the wrapped vault key instead of exposing an undecrypted edit form', async () => {
    mocks.submissions = [previousSubmission()];
    const hook = await renderFlow(activitySource(), null);

    expect(hook.result.current).toMatchObject({ isLoading: true, snapshot: null, defaultValues: null });
    expect(mocks.ensureUnlocked).not.toHaveBeenCalled();
    expect(mocks.decryptFeedbackBuckets).not.toHaveBeenCalled();
    expect(mocks.resolveForm).not.toHaveBeenCalled();
  });

  it('ignores an older form response after the source changes', async () => {
    const first = deferred<{ data: { formSnapshot: FormDefinitionSnapshot } }>();
    const second = deferred<{ data: { formSnapshot: FormDefinitionSnapshot } }>();
    const secondFormId = '99999999-9999-4999-8999-999999999999';
    mocks.resolveForm.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const hook = await renderFlow(activitySource());

    await vi.waitFor(() => expect(mocks.resolveForm).toHaveBeenCalledTimes(1));
    await hook.rerender({
      currentSource: activitySource('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      wrappedKey: wrappedVaultKey,
    });
    await vi.waitFor(() => expect(mocks.resolveForm).toHaveBeenCalledTimes(2));

    second.resolve({ data: { formSnapshot: snapshot(secondFormId) } });
    await vi.waitFor(() => expect(hook.result.current.formId).toBe(secondFormId));

    first.resolve({ data: { formSnapshot: snapshot() } });
    await Promise.resolve();
    await Promise.resolve();

    expect(hook.result.current.formId).toBe(secondFormId);
  });
});
