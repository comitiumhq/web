import type { CandidateSheetActionState, CandidateSheetCurrentActivity } from '@comitium/schemas/applications';
import { TooltipProvider } from '@comitium/ui/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ScheduleInterviewActivity } from '@/lib/schemas/stage-activities';

import { CandidateActivityRow } from './current-activity-row';

const mocks = vi.hoisted(() => ({
  calendarConnected: false,
}));

vi.mock('@/hooks/queries/use-query-interviews', () => ({
  useQueryCalendarStatus: () => ({
    data: { calendarConnected: mocks.calendarConnected },
    isError: false,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-encryption-unlocked', () => ({
  useEncryptionUnlocked: () => ({ runUnlocked: (action: () => void) => action() }),
}));

const ACTIVITY_ID = '00000000-0000-4000-8000-000000000001';

const activity: ScheduleInterviewActivity = {
  id: ACTIVITY_ID,
  stageId: '00000000-0000-4000-8000-000000000002',
  activityType: 'schedule_interview',
  activityOrder: 0,
  interviewId: '00000000-0000-4000-8000-000000000003',
  interviewTitle: 'Hiring Manager',
  durationMinutes: 45,
  defaultInterviewers: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const activityState: CandidateSheetCurrentActivity = {
  kind: 'schedule_interview',
  activityId: ACTIVITY_ID,
  canAct: true,
};

const actionState: CandidateSheetActionState = {
  status: 'action_required',
  blockedReason: null,
  nextAction: null,
};

beforeEach(() => {
  mocks.calendarConnected = false;
});

describe('CandidateActivityRow scheduling actions', () => {
  it('disables manual scheduling and scheduling links when the organizer has no connected calendar', async () => {
    const screen = await render(
      <TooltipProvider>
        <CandidateActivityRow
          activity={activity}
          activityState={activityState}
          orgId="00000000-0000-4000-8000-000000000004"
          actionState={actionState}
          onSchedule={vi.fn()}
          onCreateDirectBookingLink={vi.fn()}
          onSend={vi.fn()}
          onReview={vi.fn()}
        />
      </TooltipProvider>,
    );

    await expect.element(screen.getByRole('button', { name: 'Schedule' })).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: 'Send link' })).toBeDisabled();
  });

  it('keeps both scheduling actions available when the organizer calendar is connected', async () => {
    mocks.calendarConnected = true;
    const onSchedule = vi.fn();
    const onCreateDirectBookingLink = vi.fn();
    const screen = await render(
      <TooltipProvider>
        <CandidateActivityRow
          activity={activity}
          activityState={activityState}
          orgId="00000000-0000-4000-8000-000000000004"
          actionState={actionState}
          onSchedule={onSchedule}
          onCreateDirectBookingLink={onCreateDirectBookingLink}
          onSend={vi.fn()}
          onReview={vi.fn()}
        />
      </TooltipProvider>,
    );

    const scheduleButton = screen.getByRole('button', { name: 'Schedule' });
    const sendLinkButton = screen.getByRole('button', { name: 'Send link' });

    await expect.element(scheduleButton).toBeEnabled();
    await expect.element(sendLinkButton).toBeEnabled();
    await scheduleButton.click();
    await sendLinkButton.click();

    expect(onSchedule).toHaveBeenCalledExactlyOnceWith(activity);
    expect(onCreateDirectBookingLink).toHaveBeenCalledExactlyOnceWith(activity);
  });
});
