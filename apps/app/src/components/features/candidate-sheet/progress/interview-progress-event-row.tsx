import { formatInTimezone } from '@comitium/ui/date';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { ArrowSquareOutIcon, CheckCircleIcon, QuestionIcon, XCircleIcon } from '@phosphor-icons/react';
import { memo } from 'react';
import type { OrgTeamMember } from '@/hooks/queries/use-query-org-team';
import {
  type InterviewProgressEvent,
  type InterviewProgressInterviewer,
  InterviewStatus,
  type InterviewStatusValue,
} from '@/lib/schemas/interviews';
import { cn } from '@/lib/utils';

interface InterviewProgressEventRowProps {
  event: InterviewProgressEvent;
  memberMap: Map<string, OrgTeamMember>;
  timeZone: string;
}

export const InterviewProgressEventRow = memo(function InterviewProgressEventRow({
  event,
  memberMap,
  timeZone,
}: InterviewProgressEventRowProps) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-label-13 font-medium">{event.title}</p>
        <p className="mt-0.5 text-copy-12 text-muted-foreground">
          {formatInTimezone(event.scheduledAt, timeZone, 'EEE, MMM d · h:mm a (zzz)')} · {event.durationMinutes} min
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {event.interviewers.length > 0 && (
          <div className="flex -space-x-1.5">
            {event.interviewers.map((interviewer) => (
              <InterviewerAvatar key={interviewer.userId} interviewer={interviewer} memberMap={memberMap} />
            ))}
          </div>
        )}

        {event.meetingUrl && canJoinInterview(event.status) && (
          <a
            href={event.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-label-12 text-primary hover:underline"
          >
            Join
            <ArrowSquareOutIcon className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
});

interface InterviewerAvatarProps {
  interviewer: InterviewProgressInterviewer;
  memberMap: Map<string, OrgTeamMember>;
}

function InterviewerAvatar({ interviewer, memberMap }: InterviewerAvatarProps) {
  const member = memberMap.get(interviewer.userId) ?? null;
  const identity = member ?? { name: null };
  const displayName = member ? getMemberDisplayName(member) : 'Team member';
  const rsvpLabel = getInterviewerRsvpLabel(interviewer);
  const feedbackLabel = getInterviewerFeedbackLabel(interviewer);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${displayName}. ${rsvpLabel}. ${feedbackLabel}.`}
          className={cn(
            'relative rounded-full ring-2 ring-background focus-visible:outline-none focus-visible:ring-ring',
            {
              'opacity-60': interviewer.feedbackStatus === 'not_required',
            },
          )}
        >
          <InitialsAvatar identity={identity} size="sm" />
          <RsvpStatusIcon status={interviewer.rsvpStatus} />
        </button>
      </TooltipTrigger>
      <TooltipContent className="flex flex-col items-start">
        <p>{displayName}</p>
        <p className="text-xs text-background/75">{rsvpLabel}</p>
        <p className="text-xs text-background/75">{feedbackLabel}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function RsvpStatusIcon({ status }: { status: InterviewProgressInterviewer['rsvpStatus'] }) {
  if (!status || status === 'awaiting') {
    return null;
  }

  const config = RSVP_STATUS_ICON[status];
  const Icon = config.Icon;

  return (
    <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-background ring-1 ring-background">
      <Icon className={cn('size-3', config.className)} />
    </span>
  );
}

const RSVP_STATUS_ICON = {
  accepted: { Icon: CheckCircleIcon, className: 'text-success' },
  declined: { Icon: XCircleIcon, className: 'text-destructive' },
  tentative: { Icon: QuestionIcon, className: 'text-warning' },
} as const;

export function getInterviewerFeedbackLabel(interviewer: InterviewProgressInterviewer): string {
  if (interviewer.feedbackStatus === 'submitted') {
    return 'Feedback submitted';
  }

  if (interviewer.feedbackStatus === 'pending') {
    return 'Feedback pending';
  }

  if (interviewer.feedbackStatus === 'not_due') {
    return 'Feedback not due';
  }

  return 'Feedback not required';
}

export function getInterviewerRsvpLabel(interviewer: InterviewProgressInterviewer): string {
  if (interviewer.rsvpStatus === 'accepted') {
    return 'Invitation accepted';
  }

  if (interviewer.rsvpStatus === 'declined') {
    return 'Invitation declined';
  }

  if (interviewer.rsvpStatus === 'tentative') {
    return 'Tentatively accepted';
  }

  if (interviewer.rsvpStatus === 'awaiting') {
    return 'Awaiting invitation response';
  }

  return 'Invitation response not recorded';
}

export function canJoinInterview(status: InterviewStatusValue): boolean {
  return status === InterviewStatus.SCHEDULED || status === InterviewStatus.IN_PROGRESS;
}
