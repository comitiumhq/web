import type { PublicEncryptionKey } from '@comitium/crypto';
import type { TipTapDoc } from '@comitium/schemas/common';
import { userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook } from 'vitest-browser-react';
import type { OrgTeamMember } from '@/lib/schemas/org';
import { DirectBookingLinkDialog } from './direct-booking-link-dialog';
import type { SelectedInterviewer } from './types';
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
  avatarUrl: null,
  role: 'org_member',
  timezone: 'Europe/Warsaw',
  isActive: true,
  hasVaultAccess: true,
  hasScopedAccess: true,
  accessSummary: { departmentGrants: [], directJobAssignments: [] },
  invitedBy: null,
  createdAt: '2026-08-28T08:00:00.000Z',
} as OrgTeamMember;

const selectedInterviewer: SelectedInterviewer = {
  userId: MEMBER_ID,
  member,
  role: 'interviewer',
};

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

vi.mock('@/components/tiptap-ui/editor-toolbars', () => ({
  EditorToolbar: () => null,
}));

vi.mock('@/components/tiptap-ui/rich-text-editor', () => ({
  RichTextEditor: () => <div data-testid="message-editor" />,
}));

vi.mock('@/components/user/member-avatar', () => ({
  MemberAvatar: ({ identity }: { identity: OrgTeamMember }) => <span>{identity.name}</span>,
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
  it('allows an optional interview type selection to be cleared', async () => {
    const screen = await render(<DirectBookingLinkDialog {...params()} />);

    await screen.getByRole('button', { name: 'Show interview type options' }).click();
    await screen.getByRole('option', { name: 'Technical interview (45 min)' }).click();

    await expect
      .element(screen.getByRole('combobox', { name: 'Interview type' }))
      .toHaveValue('Technical interview (45 min)');

    await screen.getByRole('button', { name: 'Show interviewers options' }).click();
    await screen.getByRole('option', { name: 'Interviewer' }).click();
    await userEvent.keyboard('{Escape}');

    await expect.element(screen.getByRole('button', { name: 'Send scheduling link' })).toBeEnabled();

    await screen.getByRole('combobox', { name: 'Interview type' }).fill('');

    await expect.element(screen.getByRole('combobox', { name: 'Interview type' })).toHaveValue('');
    await expect.element(screen.getByRole('button', { name: 'Send scheduling link' })).toBeDisabled();
  });

  it('enables submission only with candidate, stage, template, interviewer, calendar, and vault access', async () => {
    const hook = await renderHook(
      (props?: UseDirectBookingLinkDialogParams) => useDirectBookingLinkDialog(props ?? params()),
      { initialProps: params() },
    );

    expect(hook.result.current.canSubmit).toBe(false);

    hook.result.current.handleTemplateChange(TEMPLATE_ID);
    hook.result.current.handleInterviewersChange([selectedInterviewer]);
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
    hook.result.current.handleInterviewersChange([]);
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
    hook.result.current.handleInterviewersChange([selectedInterviewer]);
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
    hook.result.current.handleInterviewersChange([selectedInterviewer]);
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
