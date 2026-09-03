import type { CandidateSheetActionState, CandidateSheetCurrentActivity } from '@comitium/schemas/applications';
import { describe, expect, it } from 'vitest';
import type {
  ApplicationReviewActivity,
  ScheduleInterviewActivity,
  SendEmailActivity,
  StageActivity,
} from '@/lib/schemas/stage-activities';

import {
  getPendingActivities,
  getPendingInterviewFeedback,
  shouldShowCurrentWork,
} from './use-candidate-activities-model';

const STAGE_ID = '00000000-0000-4000-8000-000000000001';
const INTERVIEW_ID = '00000000-0000-4000-8000-000000000002';
const SCHEDULE_ACTIVITY_ID = '00000000-0000-4000-8000-000000000003';
const EMAIL_ACTIVITY_ID = '00000000-0000-4000-8000-000000000004';
const SECOND_EMAIL_ACTIVITY_ID = '00000000-0000-4000-8000-000000000005';
const REVIEW_ACTIVITY_ID = '00000000-0000-4000-8000-000000000006';
const EVENT_ID = '00000000-0000-4000-8000-000000000007';
const NOW = '2026-07-21T10:00:00.000Z';

function scheduleActivity(): ScheduleInterviewActivity {
  return {
    id: SCHEDULE_ACTIVITY_ID,
    stageId: STAGE_ID,
    activityType: 'schedule_interview',
    activityOrder: 1,
    interviewId: INTERVIEW_ID,
    interviewTitle: 'Technical interview',
    durationMinutes: 45,
    defaultInterviewers: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function emailActivity(id: string): SendEmailActivity {
  return {
    id,
    stageId: STAGE_ID,
    activityType: 'send_email',
    activityOrder: 2,
    emailTemplateId: '00000000-0000-4000-8000-000000000008',
    emailTemplateName: 'Next steps',
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function reviewActivity(): ApplicationReviewActivity {
  return {
    id: REVIEW_ACTIVITY_ID,
    stageId: STAGE_ID,
    activityType: 'application_review',
    activityOrder: 3,
    reviewers: [],
    feedbackFormId: null,
    feedbackFormTitle: 'Application review',
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function pendingActivities(activities: StageActivity[], currentActivities: CandidateSheetCurrentActivity[]) {
  const currentActivityById = new Map(
    currentActivities.flatMap((activity) => {
      if (activity.kind === 'interview_feedback') {
        return [];
      }

      return [[activity.activityId, activity] as const];
    }),
  );

  return getPendingActivities({ activities, currentActivityById });
}

describe('getPendingActivities', () => {
  it('renders exactly the unfinished stage activities projected by the server', () => {
    const schedule = scheduleActivity();
    const firstEmail = emailActivity(EMAIL_ACTIVITY_ID);
    const secondEmail = emailActivity(SECOND_EMAIL_ACTIVITY_ID);
    const review = reviewActivity();
    const projected: CandidateSheetCurrentActivity[] = [
      { kind: 'schedule_interview', activityId: SCHEDULE_ACTIVITY_ID, canAct: true },
      { kind: 'send_email', activityId: EMAIL_ACTIVITY_ID, canAct: true },
      { kind: 'send_email', activityId: SECOND_EMAIL_ACTIVITY_ID, canAct: true },
    ];

    expect(pendingActivities([schedule, firstEmail, secondEmail, review], projected)).toEqual([
      schedule,
      firstEmail,
      secondEmail,
    ]);
  });

  it('does not use singular nextAction to remove secondary email work', () => {
    const first = emailActivity(EMAIL_ACTIVITY_ID);
    const second = emailActivity(SECOND_EMAIL_ACTIVITY_ID);
    const projected: CandidateSheetCurrentActivity[] = [
      { kind: 'send_email', activityId: EMAIL_ACTIVITY_ID, canAct: true },
      { kind: 'send_email', activityId: SECOND_EMAIL_ACTIVITY_ID, canAct: true },
    ];

    expect(pendingActivities([first, second], projected)).toEqual([first, second]);
  });
});

describe('getPendingInterviewFeedback', () => {
  it('uses server-owned interview feedback tasks including ad-hoc events', () => {
    const currentActivities: CandidateSheetCurrentActivity[] = [
      {
        kind: 'interview_feedback',
        activityId: null,
        interviewEventId: EVENT_ID,
        title: 'Ad-hoc interview',
        scheduledAt: NOW,
        canAct: false,
        feedback: {
          requiredCount: 2,
          completedCount: 1,
          currentUserRequired: false,
          currentUserSubmitted: false,
        },
      },
    ];

    expect(getPendingInterviewFeedback(currentActivities)).toEqual([
      {
        id: EVENT_ID,
        title: 'Ad-hoc interview',
        scheduledAt: NOW,
        canAct: false,
        requiredCount: 2,
        completedCount: 1,
        currentUserRequired: false,
        currentUserSubmitted: false,
      },
    ]);
  });
});

describe('shouldShowCurrentWork', () => {
  it('hides stale tasks for terminal or settling considerations', () => {
    const active: CandidateSheetActionState = { status: 'no_action', blockedReason: null, nextAction: null };
    const terminal: CandidateSheetActionState = {
      status: 'complete',
      blockedReason: 'terminal_consideration',
      nextAction: null,
    };
    const settlingCommitment: CandidateSheetActionState = {
      status: 'read_only',
      blockedReason: 'commitment_settling',
      nextAction: null,
    };

    expect(shouldShowCurrentWork(active)).toBe(true);
    expect(shouldShowCurrentWork(terminal)).toBe(false);
    expect(shouldShowCurrentWork(settlingCommitment)).toBe(false);
  });
});
