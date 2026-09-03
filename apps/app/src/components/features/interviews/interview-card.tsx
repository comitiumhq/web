import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { BROWSER_TZ, formatDate, formatInTimezone, formatRelativeTime } from '@comitium/ui/date';
import { getMemberDisplayName, type MemberDisplayIdentity } from '@comitium/ui/display-name';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import {
  ArrowSquareOutIcon,
  CalendarDotsIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DotsThreeIcon,
  LinkIcon,
  MapPinIcon,
  QuestionIcon,
  SpinnerGapIcon,
  UserMinusIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { addMinutes, isBefore } from 'date-fns';
import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import { useCompleteInterview } from '@/hooks/mutations/use-interview-mutations';
import { useQueryInterviewRsvp } from '@/hooks/queries/use-query-interview-rsvp';
import { useQueryOrgTeamMap } from '@/hooks/queries/use-query-org-team';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import {
  type InterviewEvent,
  InterviewStatus,
  type InterviewStatusValue,
  type RsvpStatus,
} from '@/lib/schemas/interviews';
import { cn } from '@/lib/utils';

import { CancelInterviewDialog } from './cancel-interview-dialog';
import { INTERVIEW_STATUS_DISPLAY } from './interview-status-display';
import { MarkNoShowDialog } from './mark-no-show-dialog';
import { RescheduleInterviewDialog } from './reschedule-dialog';

interface InterviewCardProps {
  interview: InterviewEvent;
  scheduleId: string;
  scheduleCreatedAt: string;
  availabilityRequestedAt: string | null;
  applicationId: string;
  orgId: string;
  canManage: boolean;
}

const STATUS_ICONS: Partial<Record<InterviewStatusValue, typeof CalendarIcon>> = {
  [InterviewStatus.NEEDS_SCHEDULING]: ClockIcon,
  [InterviewStatus.LINK_SENT]: LinkIcon,
  [InterviewStatus.SCHEDULED]: CalendarIcon,
  [InterviewStatus.COMPLETED]: CheckCircleIcon,
  [InterviewStatus.CANCELLED]: XCircleIcon,
  [InterviewStatus.NO_SHOW]: UserMinusIcon,
};

const RSVP_LABEL: Record<NonNullable<RsvpStatus>, string> = {
  accepted: 'Accepted',
  declined: 'Declined',
  tentative: 'Tentative',
  awaiting: 'Awaiting response',
};

const RSVP_DOT_CONFIG: Record<NonNullable<RsvpStatus>, { Icon: typeof CheckCircleIcon; color: string }> = {
  accepted: { Icon: CheckCircleIcon, color: 'text-success' },
  declined: { Icon: XCircleIcon, color: 'text-destructive' },
  tentative: { Icon: QuestionIcon, color: 'text-warning' },
  awaiting: { Icon: ClockIcon, color: 'text-muted-foreground' },
};

const DIRECT_BOOKING_LINK_TTL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function RsvpDot({ status }: { status: NonNullable<RsvpStatus> }) {
  const { Icon, color } = RSVP_DOT_CONFIG[status];

  return (
    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background ring-1 ring-background">
      <Icon className={cn('size-3', color)} />
    </span>
  );
}

function CandidateRsvpRow({ status }: { status: RsvpStatus }) {
  const config = status ? RSVP_DOT_CONFIG[status] : null;
  const label = status ? RSVP_LABEL[status].toLowerCase() : 'invited';

  return (
    <p className="mt-0.5 flex items-center gap-1 text-label-12 text-muted-foreground">
      {config && <config.Icon className={cn('size-3.5', config.color)} />}
      Candidate {label}
    </p>
  );
}

export const InterviewCard = memo(function InterviewCard({
  interview,
  scheduleId,
  scheduleCreatedAt,
  availabilityRequestedAt,
  applicationId,
  orgId,
  canManage,
}: InterviewCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const memberMap = useQueryOrgTeamMap(orgId);
  const { data: meData } = useQueryOrgMe(orgId);
  const displayTimeZone = meData?.timezone ?? BROWSER_TZ;
  const { mutate: completeInterview, isPending: isCompleting } = useCompleteInterview();
  const rsvpQuery = useQueryInterviewRsvp({
    applicationId,
    interviewId: scheduleId,
    enabled: interview.status === InterviewStatus.SCHEDULED && interview.interviewers.length > 0,
  });

  const rsvpByUserId = useMemo(() => {
    const map = new Map<string, RsvpStatus>();

    if (rsvpQuery.data?.data.status !== 'available') {
      return map;
    }

    rsvpQuery.data.data.interviewers.forEach((entry) => {
      map.set(entry.userId, entry.status);
    });

    return map;
  }, [rsvpQuery.data]);

  const rsvpAggregate = useMemo(() => {
    const total = interview.interviewers.length;
    let accepted = 0;

    for (const i of interview.interviewers) {
      if (rsvpByUserId.get(i.userId) === 'accepted') {
        accepted += 1;
      }
    }

    return { total, accepted };
  }, [interview.interviewers, rsvpByUserId]);

  const hasAcceptedSchedule = interview.status === InterviewStatus.NEEDS_SCHEDULING && Boolean(interview.scheduledAt);

  const display = hasAcceptedSchedule
    ? INTERVIEW_STATUS_DISPLAY[InterviewStatus.SCHEDULED]
    : INTERVIEW_STATUS_DISPLAY[interview.status];

  const StatusIcon = hasAcceptedSchedule ? CalendarIcon : (STATUS_ICONS[interview.status] ?? ClockIcon);

  const canCancel =
    interview.status === InterviewStatus.NEEDS_SCHEDULING ||
    interview.status === InterviewStatus.LINK_SENT ||
    interview.status === InterviewStatus.SCHEDULED;

  const canComplete = interview.status === InterviewStatus.SCHEDULED;
  const canMarkNoShow = interview.status === InterviewStatus.SCHEDULED;
  const canReschedule = interview.status === InterviewStatus.SCHEDULED;
  const isSchedulingLink = interview.status === InterviewStatus.LINK_SENT;
  const hasActions = canCancel || canComplete || canMarkNoShow || canReschedule;
  const cancelActionLabel = isSchedulingLink ? 'Cancel link' : 'Cancel interview';

  const timeData = useMemo(() => {
    if (!interview.scheduledAt) {
      return {
        canCompleteNow: true,
        canMarkNoShowNow: true,
        meetingEndLabel: '',
        meetingStartLabel: '',
        formattedDate: null,
      };
    }

    const start = new Date(interview.scheduledAt);
    const end = addMinutes(start, interview.durationMinutes);
    const now = new Date();

    return {
      canCompleteNow: !isBefore(now, end),
      canMarkNoShowNow: !isBefore(now, start),
      meetingEndLabel: formatInTimezone(end, displayTimeZone, 'h:mm a (zzz)'),
      meetingStartLabel: formatInTimezone(start, displayTimeZone, 'h:mm a (zzz)'),
      formattedDate: formatInTimezone(start, displayTimeZone, 'EEE, MMM d · h:mm a (zzz)'),
    };
  }, [interview.scheduledAt, interview.durationMinutes, displayTimeZone]);

  const handleCancel = useCallback(() => {
    setMenuOpen(false);
    setCancelOpen(true);
  }, []);

  const handleCompleteRequest = useCallback(() => {
    setMenuOpen(false);
    setCompleteOpen(true);
  }, []);

  const handleCompleteConfirm = useCallback(() => {
    completeInterview({ applicationId, interviewId: scheduleId }, { onSettled: () => setCompleteOpen(false) });
  }, [completeInterview, applicationId, scheduleId]);

  const handleNoShow = useCallback(() => {
    setMenuOpen(false);
    setNoShowOpen(true);
  }, []);

  const handleReschedule = useCallback(() => {
    setMenuOpen(false);
    setRescheduleOpen(true);
  }, []);

  const showCompletionActions = (canComplete && timeData.canCompleteNow) || canMarkNoShow;

  const linkSentData = useMemo(() => {
    if (interview.status !== InterviewStatus.LINK_SENT) {
      return null;
    }

    const requestedAt = availabilityRequestedAt ? new Date(availabilityRequestedAt) : new Date(scheduleCreatedAt);
    const expiresAt = new Date(requestedAt.getTime() + DIRECT_BOOKING_LINK_TTL_DAYS * DAY_MS);

    return {
      createdLabel: formatRelativeTime(scheduleCreatedAt),
      expiresLabel: formatDate(expiresAt, 'MMM d · h:mm a'),
    };
  }, [interview.status, availabilityRequestedAt, scheduleCreatedAt]);

  const canJoin =
    Boolean(interview.meetingUrl) &&
    (interview.status === InterviewStatus.SCHEDULED || interview.status === InterviewStatus.IN_PROGRESS);

  return (
    <>
      <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <StatusIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground sm:mt-0" />

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-label-14 font-medium">{interview.title}</span>
            <Badge variant={display.variant}>{display.label}</Badge>
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-copy-12 text-muted-foreground">
            {timeData.formattedDate && (
              <>
                <span>{timeData.formattedDate}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{interview.durationMinutes} min</span>
          </p>

          {linkSentData && (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-copy-12 text-muted-foreground">
              <span>Link created {linkSentData.createdLabel}</span>
              <span aria-hidden="true">·</span>
              <span>Expires {linkSentData.expiresLabel}</span>
            </p>
          )}

          {rsvpAggregate.total > 0 &&
            rsvpAggregate.accepted < rsvpAggregate.total &&
            rsvpQuery.data?.data.status === 'available' && (
              <p className="mt-0.5 text-copy-12 text-muted-foreground">
                {rsvpAggregate.accepted} of {rsvpAggregate.total} interviewers confirmed
              </p>
            )}

          {rsvpQuery.data?.data.status === 'available' && rsvpQuery.data.data.candidate && (
            <CandidateRsvpRow status={rsvpQuery.data.data.candidate.status} />
          )}

          {(rsvpQuery.isError || rsvpQuery.data?.data.status === 'unavailable') && (
            <p className="mt-0.5 text-copy-12 text-muted-foreground">Invitation responses unavailable</p>
          )}

          {interview.location && !interview.meetingUrl && (
            <p className="mt-0.5 flex items-center gap-1 text-copy-12 text-muted-foreground">
              <MapPinIcon className="size-3.5 shrink-0" />
              {interview.location}
            </p>
          )}

          {interview.status === InterviewStatus.COMPLETED && interview.completedAt && (
            <p className="mt-0.5 text-copy-12 text-muted-foreground">
              Completed {formatRelativeTime(interview.completedAt)}
            </p>
          )}
        </div>

        <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-end gap-2 pl-7 sm:col-span-1 sm:flex-nowrap sm:pl-0">
          {interview.interviewers.length > 0 && (
            <div className="flex -space-x-1.5">
              {interview.interviewers.map((interviewer) => {
                const status = rsvpByUserId.get(interviewer.userId) ?? null;
                const identity: MemberDisplayIdentity = memberMap.get(interviewer.userId) ?? {
                  name: 'Former member',
                };
                const displayName = getMemberDisplayName(identity);

                return (
                  <Tooltip key={interviewer.userId}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={getInterviewerRsvpAccessibleLabel(displayName, status)}
                        className="relative rounded-full ring-2 ring-background focus-visible:outline-none focus-visible:ring-ring"
                      >
                        <InitialsAvatar identity={identity} size="sm" />
                        {status && <RsvpDot status={status} />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{displayName}</p>
                      {status && <p className="text-xs text-muted-foreground capitalize">{RSVP_LABEL[status]}</p>}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {canJoin && interview.meetingUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer">
                <ArrowSquareOutIcon data-icon="inline-start" />
                Join
              </a>
            </Button>
          )}

          {canManage && hasActions && (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" disabled={isCompleting}>
                  {isCompleting ? <SpinnerGapIcon className="animate-spin" /> : <DotsThreeIcon />}
                  <span className="sr-only">Interview actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showCompletionActions && (
                  <DropdownMenuGroup>
                    {canComplete && timeData.canCompleteNow && (
                      <DropdownMenuItem onClick={handleCompleteRequest}>
                        <CheckCircleIcon />
                        Mark completed
                      </DropdownMenuItem>
                    )}
                    {canMarkNoShow && (
                      <TimeGatedMenuItem
                        enabled={timeData.canMarkNoShowNow}
                        tooltip={`Available after meeting starts at ${timeData.meetingStartLabel}`}
                        onClick={handleNoShow}
                        icon={<UserMinusIcon />}
                        label="Mark no-show"
                      />
                    )}
                  </DropdownMenuGroup>
                )}
                {canReschedule && showCompletionActions && <DropdownMenuSeparator />}
                {canReschedule && (
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleReschedule}>
                      <CalendarDotsIcon />
                      Reschedule
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                )}
                {canCancel && (showCompletionActions || canReschedule) && <DropdownMenuSeparator />}
                {canCancel && (
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleCancel} variant="destructive">
                      <XCircleIcon />
                      {cancelActionLabel}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {canReschedule && (
        <RescheduleInterviewDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          applicationId={applicationId}
          orgId={orgId}
          scheduleId={scheduleId}
          interview={interview}
        />
      )}

      {canCancel && (
        <CancelInterviewDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          orgId={orgId}
          applicationId={applicationId}
          scheduleId={scheduleId}
          interviewTitle={interview.title}
          scheduledLabel={timeData.formattedDate}
          isSchedulingLink={isSchedulingLink}
        />
      )}

      {canMarkNoShow && (
        <MarkNoShowDialog
          open={noShowOpen}
          onOpenChange={setNoShowOpen}
          applicationId={applicationId}
          scheduleId={scheduleId}
          interviewTitle={interview.title}
        />
      )}

      {canComplete && (
        <ConfirmDialog
          open={completeOpen}
          onOpenChange={setCompleteOpen}
          title="Mark interview completed?"
          description="Records this interview as completed"
          actionLabel="Mark completed"
          pendingLabel="Updating…"
          onConfirm={handleCompleteConfirm}
          isPending={isCompleting}
        />
      )}
    </>
  );
});

export function getInterviewerRsvpAccessibleLabel(displayName: string, status: RsvpStatus): string {
  const responseLabel = status ? RSVP_LABEL[status].toLowerCase() : 'not recorded';

  return `${displayName}. Invitation response ${responseLabel}.`;
}

interface TimeGatedMenuItemProps {
  enabled: boolean;
  tooltip: string;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

function TimeGatedMenuItem({ enabled, tooltip, onClick, icon, label }: TimeGatedMenuItemProps) {
  const handleDisabledSelect = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  if (enabled) {
    return (
      <DropdownMenuItem onClick={onClick}>
        {icon}
        {label}
      </DropdownMenuItem>
    );
  }

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <DropdownMenuItem disabled onSelect={handleDisabledSelect}>
          {icon}
          {label}
        </DropdownMenuItem>
      </TooltipTrigger>
      <TooltipContent side="left">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
