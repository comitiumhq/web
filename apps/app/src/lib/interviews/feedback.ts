import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import type { InterviewEvent, InterviewSchedule } from '@/lib/schemas/interviews';
import { InterviewStatus } from '@/lib/schemas/interviews';

export const TERMINAL_INTERVIEW_STATUSES = new Set<InterviewEvent['status']>(['cancelled', 'no_show']);
export const CURRENT_INTERVIEW_STATUSES = new Set<InterviewEvent['status']>([
  InterviewStatus.NEEDS_SCHEDULING,
  InterviewStatus.LINK_SENT,
  InterviewStatus.SCHEDULED,
  InterviewStatus.IN_PROGRESS,
]);

export interface InterviewEventRef {
  id: string;
  title: string;
}

export interface PendingInterviewEvent extends InterviewEventRef {
  scheduledAt: string | null;
}

export function computePendingInterviewEvents(
  schedules: InterviewSchedule[],
  submissions: FeedbackSubmission[],
  callerId?: string,
): PendingInterviewEvent[] {
  if (!callerId) {
    return [];
  }

  const submittedEventIds = collectOwnSubmittedEventIds(submissions, callerId);

  return schedules.flatMap((schedule) =>
    schedule.events
      .filter((event) => isPendingFeedbackForEvent(event, callerId, submittedEventIds))
      .map(toPendingInterviewEvent),
  );
}

function collectOwnSubmittedEventIds(submissions: FeedbackSubmission[], callerId: string): Set<string> {
  const ids = submissions
    .filter((submission) =>
      Boolean(!submission.isDeleted && submission.submittedByUserId === callerId && submission.interviewEventId),
    )
    .map((s) => s.interviewEventId as string);

  return new Set(ids);
}

function isPendingFeedbackForEvent(event: InterviewEvent, callerId: string, submittedEventIds: Set<string>): boolean {
  if (event.status !== InterviewStatus.COMPLETED) {
    return false;
  }

  if (submittedEventIds.has(event.id)) {
    return false;
  }

  return event.interviewers.some((interviewer) => interviewer.isRequired && interviewer.userId === callerId);
}

function toPendingInterviewEvent(event: InterviewEvent): PendingInterviewEvent {
  return {
    id: event.id,
    title: event.title,
    scheduledAt: event.scheduledAt,
  };
}
