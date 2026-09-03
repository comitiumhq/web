import type { PublicEncryptionKey } from '@comitium/crypto';
import type { TipTapDoc } from '@comitium/schemas/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import type { OrgTeamMember } from '@/lib/schemas/org';
import { type UseDirectBookingLinkDialogParams, useDirectBookingLinkDialog } from './use-direct-booking-link-dialog';

const mocks = vi.hoisted(() => ({
  calStatus: { calendarConnected: true } as { calendarConnected: boolean } | undefined,
  emailTemplateReset: vi.fn(),
  handleEmailTemplateChange: vi.fn(),
  isPending: false,
  onOpenChange: vi.fn(),
  sendSchedulingLink: vi.fn(),
  toastError: vi.fn(),
}));

const TEMPLATE_ID = '11111111-1111-4111-8111-111111111111';
const STAGE_ID = '22222222-2222-4222-8222-222222222222';
const NEXT_STAGE_ID = '33333333-3333-4333-8333-333333333333';
const MEMBER_ID = '44444444-4444-4444-8444-444444444444';
const vaultPublicKey = { v: 1, xwing: 'vault-key' } as PublicEncryptionKey;
const member = {
  userId: MEMBER_ID,
  walletAddress: '0x0000000000000000000000000000000000000001',
  email: 'interviewer@example.com',
  name: 'Interviewer',
  jobTitle: null,
  role: 'org_member',
  timezone: 'Europe/Warsaw',
  isActive: true,
  hasVaultAccess: true,
  hasScopedAccess: true,
  accessSummary: { departmentGrants: [], directJobAssignments: [] },
  invitedBy: null,
  createdAt: '2026-08-28T08:00:00.000Z',
} as OrgTeamMember;

vi.mock('@/hooks/queries/use-query-interview-templates', () => ({
  useQueryInterviewTemplates: () => ({
    data: {
      data: [
        {
          id: TEMPLATE_ID,
          title: 'Technical interview',
          externalTitle: null,
          durationMinutes: 45,
          instructions: null,
          feedbackFormId: null,
          isDebrief: false,
          isArchived: false,
          createdAt: '2026-08-28T08:00:00.000Z',
          updatedAt: '2026-08-28T08:00:00.000Z',
          jobCount: 0,
          jobTemplateCount: 0,
        },
      ],
    },
  }),
}));

vi.mock('@/hooks/queries/use-query-interviews', () => ({
  useQueryCalendarStatus: () => ({ data: mocks.calStatus }),
}));

vi.mock('@/hooks/queries/use-query-org-team', () => ({
  useQueryOrgTeam: () => ({ data: [member] }),
  useQueryTeamCalendarStatusMap: () => new Map([[MEMBER_ID, true]]),
}));

vi.mock('@/hooks/use-email-template-selector', () => ({
  useEmailTemplateSelector: () => ({
    templates: [],
    selectedTemplateId: 'email-template-1',
    messageDoc: null,
    resolvedSubject: '',
    emailSignature: null,
    handleTemplateChange: mocks.handleEmailTemplateChange,
    reset: mocks.emailTemplateReset,
  }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  useQueryOrgMe: () => ({ data: { timezone: 'Europe/Warsaw' } }),
}));

vi.mock('./schedule-dialog/use-prefilled-interviewers', () => ({
  usePrefilledInterviewers: vi.fn(),
}));

vi.mock('./use-send-scheduling-link', () => ({
  useSendSchedulingLink: () => ({
    sendSchedulingLink: mocks.sendSchedulingLink,
    isPending: mocks.isPending,
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError },
}));

function params(overrides: Partial<UseDirectBookingLinkDialogParams> = {}): UseDirectBookingLinkDialogParams {
  return {
    open: true,
    onOpenChange: mocks.onOpenChange,
    applicationId: '55555555-5555-4555-8555-555555555555',
    orgId: '66666666-6666-4666-8666-666666666666',
    currentStageId: STAGE_ID,
    candidateEmail: 'candidate@example.com',
    candidateFirstName: 'Candidate',
    jobTitle: 'Engineer',
    vaultPublicKey,
    vaultKeyVersion: 3,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calStatus = { calendarConnected: true };
  mocks.isPending = false;
  mocks.sendSchedulingLink.mockResolvedValue(undefined);
});

describe('useDirectBookingLinkDialog', () => {
  it('enables submission only with candidate, stage, template, interviewer, calendar, and vault access', async () => {
    const hook = await renderHook(
      (props?: UseDirectBookingLinkDialogParams) => useDirectBookingLinkDialog(props ?? params()),
      { initialProps: params() },
    );

    expect(hook.result.current.canSubmit).toBe(false);

    hook.result.current.handleTemplateChange(TEMPLATE_ID);
    hook.result.current.handleAddInterviewer(member);
    await vi.waitFor(() => expect(hook.result.current.canSubmit).toBe(true));

    await hook.rerender(params({ candidateEmail: null }));
    expect(hook.result.current.canSubmit).toBe(false);

    await hook.rerender(params({ vaultPublicKey: null }));
    expect(hook.result.current.canSubmit).toBe(false);

    mocks.calStatus = { calendarConnected: false };
    await hook.rerender(params());
    expect(hook.result.current.canSubmit).toBe(false);

    mocks.calStatus = { calendarConnected: true };
    await hook.rerender(params());
    hook.result.current.handleRemoveInterviewer(MEMBER_ID);
    await vi.waitFor(() => expect(hook.result.current.canSubmit).toBe(false));
  });

  it('closes immediately when the application has no active stage', async () => {
    await renderHook(() => useDirectBookingLinkDialog(params({ currentStageId: null })));

    await vi.waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith('Cannot create link — application has no active stage');
      expect(mocks.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });
  });

  it('resets form and interviewer state when reopened for another stage', async () => {
    const hook = await renderHook(
      (props?: UseDirectBookingLinkDialogParams) => useDirectBookingLinkDialog(props ?? params()),
      { initialProps: params() },
    );
    hook.result.current.handleTemplateChange(TEMPLATE_ID);
    hook.result.current.handleAddInterviewer(member);
    await vi.waitFor(() => expect(hook.result.current.interviewers).toHaveLength(1));

    await hook.rerender(params({ open: false }));
    await hook.rerender(params({ currentStageId: NEXT_STAGE_ID }));

    await vi.waitFor(() => {
      expect(hook.result.current.interviewers).toEqual([]);
      expect(hook.result.current.form.getValues('stageId')).toBe(NEXT_STAGE_ID);
      expect(hook.result.current.form.getValues('interviewId')).toBe('');
    });
    expect(mocks.emailTemplateReset).toHaveBeenCalled();
  });

  it('sends the validated form with the current editor content and interviewer roles', async () => {
    const messageDoc: TipTapDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Choose a time' }] }],
    };
    const hook = await renderHook(() => useDirectBookingLinkDialog(params()));
    hook.result.current.handleTemplateChange(TEMPLATE_ID);
    hook.result.current.handleAddInterviewer(member);
    await vi.waitFor(() => expect(hook.result.current.interviewers).toHaveLength(1));
    hook.result.current.editorRef.current = {
      clear: vi.fn(),
      isEmpty: () => false,
      getJSON: () => messageDoc,
      getHTML: () => '<p>Choose a time</p>',
      getText: () => 'Choose a time',
    };

    await hook.result.current.handleSubmit({
      interviewId: TEMPLATE_ID,
      durationMinutes: 45,
      stageId: STAGE_ID,
      timeZone: 'Europe/Warsaw',
      subject: 'Choose an interview time',
    });

    expect(mocks.sendSchedulingLink).toHaveBeenCalledExactlyOnceWith({
      interviewId: TEMPLATE_ID,
      durationMinutes: 45,
      stageId: STAGE_ID,
      timeZone: 'Europe/Warsaw',
      interviewers: [{ userId: MEMBER_ID, role: 'interviewer' }],
      subject: 'Choose an interview time',
      messageDoc,
      messageHtml: '<p>Choose a time</p>',
      emailTemplateId: 'email-template-1',
    });
  });
});
