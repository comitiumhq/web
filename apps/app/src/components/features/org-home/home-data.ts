import { compareDatesAsc, compareDatesDesc } from '@comitium/ui/date';
import { differenceInCalendarDays, format, isSameDay, parseISO } from 'date-fns';
import { getApplicationReviewRowUrgency } from '@/components/features/application-status';
import { InterviewStatus, type MyInterview } from '@/lib/schemas/interviews';
import type { PipelineCandidate, PipelineJob } from '@/lib/schemas/pipeline';

export const EMPTY_CANDIDATES: PipelineCandidate[] = [];
export const EMPTY_INTERVIEWS: MyInterview[] = [];
export const EMPTY_JOBS: PipelineJob[] = [];
export const JOBS_HOME_LIMIT = 8;
export const REVIEW_QUEUE_LIMIT = 12;

export type InterviewWhen = { dateLabel: string; timeLabel: string; tone: 'today' | 'soon' };

export interface AttentionCountsInput {
  applicationReviewCount: number | null;
  interviewsToScheduleCount: number;
  offerCount: number | null;
}

export interface AttentionCounts {
  interviewLabel: string;
  offerLabel: string;
  reviewLabel: string;
  total: number;
  totalLabel: string;
}

export function getHomeInterviews(interviews: readonly MyInterview[], limit: number): MyInterview[] {
  return interviews
    .filter((interview) => isHomeInterview(interview))
    .toSorted(compareHomeInterviews)
    .slice(0, limit);
}

export function isInterviewFeedbackDue(interview: MyInterview): boolean {
  return interview.status === InterviewStatus.COMPLETED;
}

export function getSchedulingAttentionCount(interviews: readonly MyInterview[]): number {
  return interviews.filter((interview) => isSchedulingAttentionInterview(interview)).length;
}

export function getApplicationReviewQueue(candidates: readonly PipelineCandidate[]): PipelineCandidate[] {
  return candidates.toSorted(compareApplicationReviewCandidate);
}

export function getInterviewWhen(scheduledAt: string, now = new Date()): InterviewWhen {
  const date = parseISO(scheduledAt);
  const timeLabel = format(date, 'h:mm a');

  if (isSameDay(date, now)) {
    return { dateLabel: 'Today', timeLabel, tone: 'today' };
  }

  const daysFromNow = differenceInCalendarDays(date, now);

  if (daysFromNow === 1) {
    return { dateLabel: 'Tomorrow', timeLabel, tone: 'soon' };
  }

  if (daysFromNow > 1 && daysFromNow <= 6) {
    return { dateLabel: format(date, 'EEE'), timeLabel, tone: 'soon' };
  }

  return { dateLabel: format(date, 'MMM d'), timeLabel, tone: 'soon' };
}

export function getInterviewTooltipLabel(scheduledAt: string, durationMinutes: number): string {
  const startLabel = format(parseISO(scheduledAt), 'MMM d, yyyy h:mm a');
  const durationLabel = formatInterviewDuration(durationMinutes);

  return `${startLabel} · ${durationLabel}`;
}

export function formatReviewQueueCount(count: number | null): string {
  if (count === null) {
    return '0';
  }

  if (count >= REVIEW_QUEUE_LIMIT) {
    return `${REVIEW_QUEUE_LIMIT}+`;
  }

  return String(count);
}

export function getAttentionCounts({
  applicationReviewCount,
  interviewsToScheduleCount,
  offerCount,
}: AttentionCountsInput): AttentionCounts {
  const reviewCount = applicationReviewCount ?? 0;
  const total = reviewCount + interviewsToScheduleCount + (offerCount ?? 0);

  return {
    interviewLabel: String(interviewsToScheduleCount),
    offerLabel: String(offerCount ?? 0),
    reviewLabel: formatReviewQueueCount(applicationReviewCount),
    total,
    totalLabel: formatAttentionTotalCount(total, applicationReviewCount),
  };
}

function isApplicationReviewCandidateOverdue(candidate: PipelineCandidate): boolean {
  return getApplicationReviewRowUrgency(candidate.isResponded, candidate.responseDeadline) === 'overdue';
}

function formatAttentionTotalCount(total: number, reviewCount: number | null): string {
  if (isLimitedReviewQueueCount(reviewCount)) {
    return `${total}+`;
  }

  return String(total);
}

function formatInterviewDuration(durationMinutes: number): string {
  if (durationMinutes === 1) {
    return '1 min';
  }

  return `${durationMinutes} min`;
}

function isLimitedReviewQueueCount(count: number | null): boolean {
  return count !== null && count >= REVIEW_QUEUE_LIMIT;
}

function isSchedulingAttentionInterview(interview: MyInterview): boolean {
  return interview.status === InterviewStatus.NEEDS_SCHEDULING || interview.status === InterviewStatus.LINK_SENT;
}

function isHomeInterview(interview: MyInterview): boolean {
  if (interview.status === InterviewStatus.COMPLETED) {
    return true;
  }

  const hasScheduledTime = interview.scheduledAt !== null;
  const isScheduled =
    interview.status === InterviewStatus.SCHEDULED || interview.status === InterviewStatus.IN_PROGRESS;

  return hasScheduledTime && isScheduled;
}

function compareHomeInterviews(a: MyInterview, b: MyInterview): number {
  const aFeedbackDue = isInterviewFeedbackDue(a);
  const bFeedbackDue = isInterviewFeedbackDue(b);
  const feedbackDueComparison = Number(bFeedbackDue) - Number(aFeedbackDue);

  if (feedbackDueComparison !== 0) {
    return feedbackDueComparison;
  }

  return compareDatesAsc(a.scheduledAt, b.scheduledAt);
}

function compareApplicationReviewCandidate(a: PipelineCandidate, b: PipelineCandidate): number {
  const overdueComparison =
    Number(isApplicationReviewCandidateOverdue(b)) - Number(isApplicationReviewCandidateOverdue(a));

  if (overdueComparison !== 0) {
    return overdueComparison;
  }

  const deadlineComparison = compareNullableDeadlines(a.responseDeadline, b.responseDeadline);

  if (deadlineComparison !== 0) {
    return deadlineComparison;
  }

  return compareDatesDesc(a.appliedAt, b.appliedAt);
}

function compareNullableDeadlines(a: string | null, b: string | null): number {
  if (a === null && b === null) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  return compareDatesAsc(a, b);
}
