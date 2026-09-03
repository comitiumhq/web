import { beforeEach, describe, expect, it, vi } from 'vitest';
import { qk } from '@/hooks/query-keys';

const mocks = vi.hoisted(() => ({
  cancelInterview: vi.fn(),
  completeInterview: vi.fn(),
  createDirectBookingLink: vi.fn(),
  hasApiErrorCode: vi.fn(),
  invalidateQueries: vi.fn(),
  markInterviewNoShow: vi.fn(),
  mutationOptions: null as MutationOptions | null,
  rescheduleInterview: vi.fn(),
  scheduleInterview: vi.fn(),
  sendDirectBookingLink: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: MutationOptions) => {
    mocks.mutationOptions = options;

    return { mutate: vi.fn(), isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

vi.mock('@/lib/api/client', () => ({
  hasApiErrorCode: mocks.hasApiErrorCode,
}));

vi.mock('@/lib/api/interviews', () => ({
  cancelInterview: mocks.cancelInterview,
  completeInterview: mocks.completeInterview,
  createDirectBookingLink: mocks.createDirectBookingLink,
  markInterviewNoShow: mocks.markInterviewNoShow,
  rescheduleInterview: mocks.rescheduleInterview,
  scheduleInterview: mocks.scheduleInterview,
  sendDirectBookingLink: mocks.sendDirectBookingLink,
}));

import {
  useCancelInterview,
  useCompleteInterview,
  useCreateDirectBookingLink,
  useMarkInterviewNoShow,
  useRescheduleInterview,
  useScheduleInterview,
  useSendDirectBookingLink,
} from '../use-interview-mutations';

interface MutationOptions {
  mutationFn: (variables: never) => Promise<unknown>;
  onError: (error: Error) => void;
  onSuccess: (result: unknown, variables: never) => void;
}

const APPLICATION_ID = '11111111-1111-4111-8111-111111111111';
const INTERVIEW_ID = '22222222-2222-4222-8222-222222222222';
const STAGE_ID = '33333333-3333-4333-8333-333333333333';
const TEMPLATE_ID = '44444444-4444-4444-8444-444444444444';
const INTERVIEWER_ID = '55555555-5555-4555-8555-555555555555';
const SCHEDULE_ID = '66666666-6666-4666-8666-666666666666';

const scheduleBody = {
  interviewId: TEMPLATE_ID,
  interviewers: [{ userId: INTERVIEWER_ID, role: 'interviewer' as const }],
  mode: 'manual' as const,
  scheduledAt: '2026-08-29T10:00:00.000Z',
  stageId: STAGE_ID,
  candidateEmail: 'candidate@example.com',
  timeZone: 'Europe/Warsaw',
};

function getOptions(setup: () => unknown): MutationOptions {
  setup();

  if (!mocks.mutationOptions) {
    throw new Error('Mutation options were not registered');
  }

  return mocks.mutationOptions;
}

function expectInterviewCachesInvalidated() {
  expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.application.detail(APPLICATION_ID) });
  expect(mocks.invalidateQueries).toHaveBeenCalledWith({ predicate: expect.any(Function) });
  expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.pipeline.root() });
  expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.application.interviews(APPLICATION_ID) });
  expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.application.interviewProgress(APPLICATION_ID) });
  expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.candidate.activityRoot() });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mutationOptions = null;
  mocks.hasApiErrorCode.mockReturnValue(false);
});

describe('interview mutations', () => {
  it('schedules through the API, reports both accepted states, and refreshes every affected projection', async () => {
    const options = getOptions(useScheduleInterview);
    const variables = { applicationId: APPLICATION_ID, body: scheduleBody };
    mocks.scheduleInterview.mockResolvedValue({ status: 'needs_scheduling' });

    await options.mutationFn(variables as never);

    expect(mocks.scheduleInterview).toHaveBeenCalledExactlyOnceWith(APPLICATION_ID, scheduleBody);
    options.onSuccess({ status: 'scheduled' }, variables as never);
    expect(mocks.toastSuccess).toHaveBeenLastCalledWith('Interview scheduled');
    expectInterviewCachesInvalidated();

    vi.clearAllMocks();
    options.onSuccess({ status: 'needs_scheduling' }, variables as never);
    expect(mocks.toastSuccess).toHaveBeenLastCalledWith('Interview scheduling started');
    expectInterviewCachesInvalidated();
  });

  it.each([
    {
      name: 'send a direct booking link',
      setup: useSendDirectBookingLink,
      api: mocks.sendDirectBookingLink,
      variables: {
        applicationId: APPLICATION_ID,
        scheduleId: SCHEDULE_ID,
        body: { content: { ct: 'ciphertext' }, deliveryGrant: { deliveryGrantId: 'grant', deliveryGrantKey: {} } },
      },
      apiArgs: [
        APPLICATION_ID,
        SCHEDULE_ID,
        { content: { ct: 'ciphertext' }, deliveryGrant: { deliveryGrantId: 'grant', deliveryGrantKey: {} } },
      ],
      successMessage: 'Scheduling link is being sent',
    },
    {
      name: 'reschedule an interview',
      setup: useRescheduleInterview,
      api: mocks.rescheduleInterview,
      variables: {
        applicationId: APPLICATION_ID,
        interviewId: INTERVIEW_ID,
        body: { scheduledAt: '2026-08-30T10:00:00.000Z', timeZone: 'Europe/Warsaw' },
      },
      apiArgs: [APPLICATION_ID, INTERVIEW_ID, { scheduledAt: '2026-08-30T10:00:00.000Z', timeZone: 'Europe/Warsaw' }],
      successMessage: 'Interview rescheduled',
    },
    {
      name: 'cancel an interview',
      setup: useCancelInterview,
      api: mocks.cancelInterview,
      variables: { applicationId: APPLICATION_ID, interviewId: INTERVIEW_ID, body: { note: 'Candidate requested' } },
      apiArgs: [APPLICATION_ID, INTERVIEW_ID, { note: 'Candidate requested' }],
      successMessage: 'Interview cancelled',
    },
    {
      name: 'complete an interview',
      setup: useCompleteInterview,
      api: mocks.completeInterview,
      variables: { applicationId: APPLICATION_ID, interviewId: INTERVIEW_ID },
      apiArgs: [APPLICATION_ID, INTERVIEW_ID],
      successMessage: 'Interview marked as completed',
    },
    {
      name: 'mark a no-show',
      setup: useMarkInterviewNoShow,
      api: mocks.markInterviewNoShow,
      variables: { applicationId: APPLICATION_ID, interviewId: INTERVIEW_ID },
      apiArgs: [APPLICATION_ID, INTERVIEW_ID],
      successMessage: 'Interview marked as no-show',
    },
  ])(
    '$name through its API and refreshes the interview projections',
    async ({ setup, api, variables, apiArgs, successMessage }) => {
      api.mockResolvedValue({ success: true });
      const options = getOptions(setup);

      await options.mutationFn(variables as never);
      options.onSuccess(undefined, variables as never);

      expect(api).toHaveBeenCalledExactlyOnceWith(...apiArgs);
      expect(mocks.toastSuccess).toHaveBeenCalledExactlyOnceWith(successMessage);
      expectInterviewCachesInvalidated();
    },
  );

  it('creates a direct booking link and refreshes projections without a premature success toast', async () => {
    const variables = {
      applicationId: APPLICATION_ID,
      body: {
        interviewId: TEMPLATE_ID,
        interviewers: [{ userId: INTERVIEWER_ID, role: 'interviewer' as const }],
        stageId: STAGE_ID,
        candidateEmail: 'candidate@example.com',
        timeZone: 'Europe/Warsaw',
      },
    };
    mocks.createDirectBookingLink.mockResolvedValue({ data: { scheduleId: SCHEDULE_ID } });
    const options = getOptions(useCreateDirectBookingLink);

    await options.mutationFn(variables as never);
    options.onSuccess(undefined, variables as never);

    expect(mocks.createDirectBookingLink).toHaveBeenCalledExactlyOnceWith(APPLICATION_ID, variables.body);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expectInterviewCachesInvalidated();
  });

  it('lets availability conflicts stay in the scheduling UI and reports other errors', () => {
    const error = new Error('Slot is no longer available');
    const scheduleOptions = getOptions(useScheduleInterview);
    mocks.hasApiErrorCode.mockReturnValue(true);

    scheduleOptions.onError(error);

    expect(mocks.toastError).not.toHaveBeenCalled();

    const createLinkOptions = getOptions(useCreateDirectBookingLink);
    createLinkOptions.onError(error);
    expect(mocks.toastError).not.toHaveBeenCalled();

    mocks.hasApiErrorCode.mockReturnValue(false);
    scheduleOptions.onError(error);
    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith(error.message);
  });
});
