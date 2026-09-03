import type { CandidateSheetActionState, CandidateSheetCurrentActivity } from '@comitium/schemas/applications';
import { Button } from '@comitium/ui/button';
import { formatDate } from '@comitium/ui/date';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { CalendarPlusIcon, ChatCenteredTextIcon, EnvelopeSimpleIcon, type Icon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';
import { useQueryCalendarStatus } from '@/hooks/queries/use-query-interviews';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import { ApplicationReviewIcon } from '@/lib/constants/domain-icons';
import type { PendingInterviewEvent } from '@/lib/interviews/feedback';
import type {
  ApplicationReviewActivity,
  ScheduleInterviewActivity,
  SendEmailActivity,
  StageActivity,
} from '@/lib/schemas/stage-activities';

import { isPrimaryActivityAction } from '../model/candidate-sheet-action-state';
import { getCalendarActionDisabledReason } from './calendar-action-availability';
import type { PendingInterviewFeedbackActivity } from './use-candidate-activities-model';

interface ActivityCardProps {
  icon: Icon;
  primary: string;
  secondary?: string;
  actionLabel: string | null;
  onClick: (() => void) | null;
  secondaryActionLabel?: string;
  onSecondaryClick?: () => void;
  disabledReason?: string | null;
  emphasized: boolean;
}

function ActivityCard({
  icon: Icon,
  primary,
  secondary,
  actionLabel,
  onClick,
  secondaryActionLabel,
  onSecondaryClick,
  disabledReason,
  emphasized,
}: ActivityCardProps) {
  return (
    <div className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-label-14 font-medium">{primary}</p>
        {secondary && <p className="mt-0.5 line-clamp-2 text-copy-12 text-muted-foreground">{secondary}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {secondaryActionLabel && onSecondaryClick && (
          <ActivityActionButton
            label={secondaryActionLabel}
            onClick={onSecondaryClick}
            disabledReason={disabledReason}
            emphasized={false}
          />
        )}
        {actionLabel && onClick && (
          <ActivityActionButton
            label={actionLabel}
            onClick={onClick}
            disabledReason={disabledReason}
            emphasized={emphasized}
          />
        )}
      </div>
    </div>
  );
}

interface ActivityActionButtonProps {
  label: string;
  onClick: () => void;
  disabledReason?: string | null;
  emphasized: boolean;
}

function ActivityActionButton({ label, onClick, disabledReason, emphasized }: ActivityActionButtonProps) {
  const button = (
    <Button
      type="button"
      variant={emphasized ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      disabled={Boolean(disabledReason)}
    >
      {label}
    </Button>
  );

  if (!disabledReason) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
}

interface ScheduleActivityRowProps {
  activity: ScheduleInterviewActivity;
  orgId: string;
  onSchedule: (activity: ScheduleInterviewActivity) => void;
  onCreateDirectBookingLink: (activity: ScheduleInterviewActivity) => void;
  canAct: boolean;
  emphasized: boolean;
}

const ScheduleActivityRow = memo(function ScheduleActivityRow({
  activity,
  orgId,
  onSchedule,
  onCreateDirectBookingLink,
  canAct,
  emphasized,
}: ScheduleActivityRowProps) {
  const calendarQuery = useQueryCalendarStatus(orgId);
  const { runUnlocked } = useEncryptionUnlocked(orgId);
  const disabledReason = getCalendarActionDisabledReason({
    hasData: Boolean(calendarQuery.data),
    isLoading: calendarQuery.isLoading,
    isError: calendarQuery.isError,
    isConnected: calendarQuery.data?.calendarConnected === true,
  });
  const handleClick = useCallback(() => runUnlocked(() => onSchedule(activity)), [runUnlocked, activity, onSchedule]);

  const handleCreateLink = useCallback(
    () => runUnlocked(() => onCreateDirectBookingLink(activity)),
    [runUnlocked, activity, onCreateDirectBookingLink],
  );

  return (
    <ActivityCard
      icon={CalendarPlusIcon}
      primary={activity.interviewTitle}
      secondary={`${activity.durationMinutes} min`}
      actionLabel={canAct ? 'Schedule' : null}
      onClick={canAct ? handleClick : null}
      secondaryActionLabel={canAct ? 'Send link' : undefined}
      onSecondaryClick={canAct ? handleCreateLink : undefined}
      disabledReason={disabledReason}
      emphasized={emphasized}
    />
  );
});

interface SendEmailActivityRowProps {
  activity: SendEmailActivity;
  orgId: string;
  onSend: (activity: SendEmailActivity) => void;
  canAct: boolean;
  emphasized: boolean;
}

const SendEmailActivityRow = memo(function SendEmailActivityRow({
  activity,
  orgId,
  onSend,
  canAct,
  emphasized,
}: SendEmailActivityRowProps) {
  const { runUnlocked } = useEncryptionUnlocked(orgId);
  const handleClick = useCallback(() => runUnlocked(() => onSend(activity)), [runUnlocked, activity, onSend]);

  return (
    <ActivityCard
      icon={EnvelopeSimpleIcon}
      primary={`Send: ${activity.emailTemplateName}`}
      actionLabel={canAct ? 'Send' : null}
      onClick={canAct ? handleClick : null}
      emphasized={emphasized}
    />
  );
});

interface ApplicationReviewActivityRowProps {
  activity: ApplicationReviewActivity;
  orgId: string;
  submittedCount: number;
  totalReviewers: number;
  onReview: (activity: ApplicationReviewActivity) => void;
  canAct: boolean;
  emphasized: boolean;
}

const ApplicationReviewActivityRow = memo(function ApplicationReviewActivityRow({
  activity,
  orgId,
  submittedCount,
  totalReviewers,
  onReview,
  canAct,
  emphasized,
}: ApplicationReviewActivityRowProps) {
  const { runUnlocked } = useEncryptionUnlocked(orgId);
  const handleClick = useCallback(() => runUnlocked(() => onReview(activity)), [runUnlocked, activity, onReview]);
  const formLabel = activity.feedbackFormTitle ?? 'Org default form';
  const reviewProgress = totalReviewers > 0 ? `${submittedCount} of ${totalReviewers} reviewed` : null;
  const secondary = reviewProgress ? `${formLabel} · ${reviewProgress}` : formLabel;

  return (
    <ActivityCard
      icon={ApplicationReviewIcon}
      primary="Application Review"
      secondary={secondary}
      actionLabel={canAct ? 'Review' : null}
      onClick={canAct ? handleClick : null}
      emphasized={emphasized}
    />
  );
});

interface InterviewFeedbackActivityRowProps {
  event: PendingInterviewFeedbackActivity;
  orgId: string;
  onSubmit: (event: PendingInterviewEvent) => void;
  canAct: boolean;
  emphasized: boolean;
}

export const InterviewFeedbackActivityRow = memo(function InterviewFeedbackActivityRow({
  event,
  orgId,
  onSubmit,
  canAct,
  emphasized,
}: InterviewFeedbackActivityRowProps) {
  const { runUnlocked } = useEncryptionUnlocked(orgId);
  const handleClick = useCallback(() => runUnlocked(() => onSubmit(event)), [runUnlocked, event, onSubmit]);
  const secondary = getInterviewFeedbackSecondary(event);

  return (
    <ActivityCard
      icon={ChatCenteredTextIcon}
      primary={event.title}
      secondary={secondary}
      actionLabel={canAct ? 'Submit feedback' : null}
      onClick={canAct ? handleClick : null}
      emphasized={emphasized}
    />
  );
});

export function getInterviewFeedbackSecondary(event: PendingInterviewFeedbackActivity): string {
  const parts: string[] = [];

  if (event.scheduledAt) {
    parts.push(formatDate(event.scheduledAt, 'MMM d · h:mm a'));
  }

  parts.push(`${event.completedCount} of ${event.requiredCount} feedback submitted`);

  if (event.currentUserSubmitted) {
    parts.push('Your feedback is submitted');
  } else if (!event.currentUserRequired) {
    parts.push('Waiting on assigned interviewers');
  } else if (!event.canAct) {
    parts.push('Feedback submission unavailable');
  }

  return parts.join(' · ');
}

interface CandidateActivityRowProps {
  activity: StageActivity;
  activityState: CandidateSheetCurrentActivity | null;
  orgId: string;
  actionState: CandidateSheetActionState;
  onSchedule: (activity: ScheduleInterviewActivity) => void;
  onCreateDirectBookingLink: (activity: ScheduleInterviewActivity) => void;
  onSend: (activity: SendEmailActivity) => void;
  onReview: (activity: ApplicationReviewActivity) => void;
}

export function canActOnCurrentActivity(activityState: CandidateSheetCurrentActivity | null): boolean {
  return activityState?.canAct ?? false;
}

export const CandidateActivityRow = memo(function CandidateActivityRow({
  activity,
  activityState,
  orgId,
  actionState,
  onSchedule,
  onCreateDirectBookingLink,
  onSend,
  onReview,
}: CandidateActivityRowProps) {
  if (activity.activityType === 'schedule_interview') {
    const emphasized = isPrimaryActivityAction(actionState, 'schedule_interview', activity.id);

    return (
      <ScheduleActivityRow
        activity={activity}
        orgId={orgId}
        onSchedule={onSchedule}
        onCreateDirectBookingLink={onCreateDirectBookingLink}
        canAct={canActOnCurrentActivity(activityState)}
        emphasized={emphasized}
      />
    );
  }

  if (activity.activityType === 'send_email') {
    const emphasized = isPrimaryActivityAction(actionState, 'send_email', activity.id);

    return (
      <SendEmailActivityRow
        activity={activity}
        orgId={orgId}
        onSend={onSend}
        canAct={canActOnCurrentActivity(activityState)}
        emphasized={emphasized}
      />
    );
  }

  const emphasized = isPrimaryActivityAction(actionState, 'review_application', activity.id);

  return (
    <ApplicationReviewActivityRow
      activity={activity}
      orgId={orgId}
      submittedCount={activityState?.kind === 'application_review' ? activityState.feedback.completedCount : 0}
      totalReviewers={
        activityState?.kind === 'application_review' ? activityState.feedback.requiredCount : activity.reviewers.length
      }
      onReview={onReview}
      canAct={canActOnCurrentActivity(activityState)}
      emphasized={emphasized}
    />
  );
});
