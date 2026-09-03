import { TERMINAL_INTERVIEW_STATUSES } from '@/lib/interviews/feedback';
import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import type { InterviewEvent, InterviewSchedule } from '@/lib/schemas/interviews';
import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';
import { isNonNull } from '@/lib/utils';

import type { FeedbackAccessState, SourceGroup, SourceGroupItem } from './types';

export function buildGroups(
  activities: ApplicationReviewActivity[],
  schedules: InterviewSchedule[],
  submissions: FeedbackSubmission[],
  currentUserId: string,
  access: FeedbackAccessState,
): SourceGroup[] {
  const arGroups = activities
    .map((activity) => toArGroup(activity, submissions, currentUserId, access))
    .filter(isNonNull);
  const eventGroups = collectEvents(schedules)
    .map((event) => toEventGroup(event, submissions, currentUserId, access))
    .filter(isNonNull);

  const visibleGroups = [...arGroups, ...eventGroups];
  const consumedIds = collectSubmittedIds(visibleGroups);
  const orphans = submissions.filter((s) => !consumedIds.has(s.id));

  return orphans.length > 0 ? [...visibleGroups, toOrphanGroup(orphans)] : visibleGroups;
}

function toArGroup(
  activity: ApplicationReviewActivity,
  submissions: FeedbackSubmission[],
  currentUserId: string,
  access: FeedbackAccessState,
): SourceGroup | null {
  const items = buildItemsForActivity(activity, submissions, currentUserId, access);

  if (items.length === 0) {
    return null;
  }

  const formLabel = activity.feedbackFormTitle ?? 'Org default form';
  const subtitle =
    activity.reviewers.length > 0
      ? `${formLabel} · ${formatReviewerCount(activity.reviewers.length)}`
      : `${formLabel} · Hiring team with feedback access`;

  return {
    kind: 'ar',
    id: `ar-${activity.id}`,
    title: 'Application Review',
    subtitle,
    activity,
    items,
  };
}

function buildItemsForActivity(
  activity: ApplicationReviewActivity,
  allSubmissions: FeedbackSubmission[],
  currentUserId: string,
  access: FeedbackAccessState,
): SourceGroupItem[] {
  const submissions = allSubmissions.filter((s) => s.activityId === activity.id);
  const submittersByUserId = new Map(
    submissions.flatMap((submission) =>
      submission.submittedByUserId ? [[submission.submittedByUserId, submission] as const] : [],
    ),
  );

  if (activity.reviewers.length > 0) {
    const reviewerItems: SourceGroupItem[] = activity.reviewers.map((reviewer) => {
      const isMe = reviewer.userId === currentUserId;
      const submission = submittersByUserId.get(reviewer.userId);

      return submission
        ? { kind: 'submitted', submission }
        : {
            kind: 'pending-reviewer',
            userId: reviewer.userId,
            canSubmit: isMe && access.canSubmitFeedback,
          };
    });
    const isReviewer = activity.reviewers.some((reviewer) => reviewer.userId === currentUserId);
    const showModeratorAdd = access.canModerateFeedback && !isReviewer && !submittersByUserId.has(currentUserId);

    return showModeratorAdd ? [...reviewerItems, { kind: 'add-mine' }] : reviewerItems;
  }

  const submittedItems = submissions.map((s) => ({ kind: 'submitted', submission: s }) as const);
  const canAddPassiveFeedback = access.canModerateFeedback || (access.isOnHiringTeam && access.canSubmitFeedback);
  const showAddMine = Boolean(currentUserId) && canAddPassiveFeedback && !submittersByUserId.has(currentUserId);

  return showAddMine ? [...submittedItems, { kind: 'add-mine' }] : submittedItems;
}

function toEventGroup(
  event: InterviewEvent,
  allSubmissions: FeedbackSubmission[],
  currentUserId: string,
  access: FeedbackAccessState,
): SourceGroup | null {
  if (event.interviewers.length === 0) {
    return null;
  }

  const eventSubmissions = allSubmissions.filter((s) => s.interviewEventId === event.id);
  const submittersByUserId = new Map(
    eventSubmissions.flatMap((submission) =>
      submission.submittedByUserId ? [[submission.submittedByUserId, submission] as const] : [],
    ),
  );

  const items: SourceGroupItem[] = event.interviewers.map((interviewer) => {
    const isMe = interviewer.userId === currentUserId;
    const submission = submittersByUserId.get(interviewer.userId);

    return submission
      ? { kind: 'submitted', submission }
      : {
          kind: 'pending-reviewer',
          userId: interviewer.userId,
          canSubmit: isMe && access.canSubmitFeedback,
        };
  });
  const isInterviewer = event.interviewers.some((interviewer) => interviewer.userId === currentUserId);
  const showModeratorAdd = access.canModerateFeedback && !isInterviewer && !submittersByUserId.has(currentUserId);

  return {
    kind: 'event',
    id: `event-${event.id}`,
    title: event.title,
    subtitle: buildEventSubtitle(items.length, eventSubmissions[0]?.formSnapshot.title ?? null),
    eventId: event.id,
    interviewTitle: event.title,
    items: showModeratorAdd ? [...items, { kind: 'add-mine' }] : items,
  };
}

function buildEventSubtitle(interviewerCount: number, formLabel: string | null): string {
  const interviewerPart = `${interviewerCount} ${interviewerCount === 1 ? 'interviewer' : 'interviewers'}`;

  if (!formLabel) {
    return interviewerPart;
  }

  return `${formLabel} · ${interviewerPart}`;
}

function formatReviewerCount(reviewerCount: number): string {
  const label = reviewerCount === 1 ? 'reviewer' : 'reviewers';

  return `${reviewerCount} ${label}`;
}

function collectEvents(schedules: InterviewSchedule[]): InterviewEvent[] {
  return schedules.flatMap((schedule) => schedule.events).filter((e) => !TERMINAL_INTERVIEW_STATUSES.has(e.status));
}

function toOrphanGroup(submissions: FeedbackSubmission[]): SourceGroup {
  return {
    kind: 'orphan',
    id: 'other',
    title: 'Earlier feedback',
    subtitle: 'Submissions from previous stages or interviews',
    items: submissions.map((s) => ({ kind: 'submitted', submission: s }) as const),
  };
}

function collectSubmittedIds(groups: SourceGroup[]): Set<string> {
  return new Set(groups.flatMap((g) => g.items.flatMap((i) => (i.kind === 'submitted' ? [i.submission.id] : []))));
}

export function itemKey(item: SourceGroupItem, idx: number): string {
  if (item.kind === 'submitted') {
    return `s-${item.submission.id}`;
  }

  if (item.kind === 'pending-reviewer') {
    return `p-${item.userId}`;
  }

  return `cta-${idx}`;
}
