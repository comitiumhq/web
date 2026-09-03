import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import type { MemberDisplayIdentity } from '@comitium/ui/display-name';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comitium/ui/tooltip';
import { useSortable } from '@dnd-kit/react/sortable';
import {
  CalendarDotsIcon,
  ClockIcon,
  DotsSixVerticalIcon,
  DotsThreeVerticalIcon,
  EnvelopeSimpleIcon,
  LockIcon,
  PencilIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { useDeleteOwnerActivity } from '@/hooks/mutations/use-stage-activity-mutations';
import { ApplicationReviewIcon, FeedbackFormIcon } from '@/lib/constants/domain-icons';
import type { StageActivity, StageActivityOwner } from '@/lib/schemas/stage-activities';
import { cn } from '@/lib/utils';

const ACTIVITY_TYPE_LABEL: Record<StageActivity['activityType'], string> = {
  application_review: 'application review',
  schedule_interview: 'interview',
  send_email: 'send-email',
};

const VISIBLE_AVATARS = 3;

interface ActivityRowProps {
  activity: StageActivity;
  owner: StageActivityOwner;
  memberMap: ReadonlyMap<string, MemberDisplayIdentity>;
  canManage: boolean;
  isReviewStage: boolean;
  index: number;
  onEdit: (activity: StageActivity) => void;
}

export const ActivityRow = memo(function ActivityRow({
  activity,
  owner,
  memberMap,
  canManage,
  isReviewStage,
  index,
  onEdit,
}: ActivityRowProps) {
  const { mutate: deleteActivity, isPending: isDeleting } = useDeleteOwnerActivity();
  const { ref, handleRef, isDragging } = useSortable({ id: activity.id, index, disabled: !canManage });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteRequest = useCallback(() => setConfirmOpen(true), []);

  const handleDeleteConfirm = useCallback(() => {
    deleteActivity({ owner, activityId: activity.id }, { onSettled: () => setConfirmOpen(false) });
  }, [owner, activity.id, deleteActivity]);

  const handleEdit = useCallback(() => {
    onEdit(activity);
  }, [onEdit, activity]);

  const isRequiredReview = activity.activityType === 'application_review' && isReviewStage;
  const canDelete = !isRequiredReview;
  const activityLabel = ACTIVITY_TYPE_LABEL[activity.activityType];
  const accessibleName = getActivityAccessibleName(activity);

  return (
    <div
      ref={ref}
      className={cn('flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-1 py-3 transition-all', {
        'relative z-50 rounded-xl bg-card px-3 opacity-90 shadow-lg ring-1 ring-primary/50': isDragging,
      })}
    >
      {canManage && (
        <Button
          ref={handleRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
          aria-label={`Reorder ${accessibleName}`}
        >
          <DotsSixVerticalIcon />
        </Button>
      )}

      {activity.activityType === 'schedule_interview' && (
        <ScheduleInterviewBody activity={activity} memberMap={memberMap} />
      )}

      {activity.activityType === 'send_email' && <SendEmailBody activity={activity} />}

      {activity.activityType === 'application_review' && (
        <ApplicationReviewBody activity={activity} memberMap={memberMap} isRequired={isRequiredReview} />
      )}

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              aria-label={`Actions for ${accessibleName}`}
            >
              <DotsThreeVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuItem onClick={handleEdit}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem variant="destructive" onClick={handleDeleteRequest} disabled={isDeleting}>
                <TrashIcon />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {canDelete && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete activity?"
          description={`This ${activityLabel} activity will be removed from the stage. Past submissions stay intact.`}
          actionLabel="Delete"
          pendingLabel="Deleting…"
          onConfirm={handleDeleteConfirm}
          isPending={isDeleting}
        />
      )}
    </div>
  );
});

interface ScheduleInterviewBodyProps {
  activity: Extract<StageActivity, { activityType: 'schedule_interview' }>;
  memberMap: ReadonlyMap<string, MemberDisplayIdentity>;
}

function ScheduleInterviewBody({ activity, memberMap }: ScheduleInterviewBodyProps) {
  const interviewers = activity.defaultInterviewers ?? [];

  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <CalendarDotsIcon className="size-4" />
      </span>
      <div className="min-w-32 flex-1">
        <span className="text-label-14 truncate block font-medium">{activity.interviewTitle}</span>
      </div>

      <Badge variant="secondary">
        <ClockIcon data-icon="inline-start" />
        {activity.durationMinutes} min
      </Badge>

      {interviewers.length > 0 && <MemberAvatarStack members={interviewers} memberMap={memberMap} />}
    </>
  );
}

interface SendEmailBodyProps {
  activity: Extract<StageActivity, { activityType: 'send_email' }>;
}

function SendEmailBody({ activity }: SendEmailBodyProps) {
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <EnvelopeSimpleIcon className="size-4" />
      </span>
      <div className="min-w-32 flex-1">
        <span className="text-label-14 truncate block font-medium">Send: {activity.emailTemplateName}</span>
      </div>
    </>
  );
}

interface ApplicationReviewBodyProps {
  activity: Extract<StageActivity, { activityType: 'application_review' }>;
  memberMap: ReadonlyMap<string, MemberDisplayIdentity>;
  isRequired: boolean;
}

function ApplicationReviewBody({ activity, memberMap, isRequired }: ApplicationReviewBodyProps) {
  const formLabel = activity.feedbackFormTitle ?? 'Org default form';
  const isPassive = activity.reviewers.length === 0;

  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ApplicationReviewIcon className="size-4" />
      </span>
      <div className="flex min-w-32 flex-1 items-center gap-1">
        <span className="block truncate text-label-14 font-medium">Application Review</span>
        {isRequired ? <RequiredReviewIndicator /> : null}
      </div>

      <Badge variant="secondary" className="max-w-48 sm:max-w-64">
        <FeedbackFormIcon data-icon="inline-start" />
        <span className="truncate">{formLabel}</span>
      </Badge>

      {isPassive ? (
        <span className="max-w-full truncate text-label-12 text-muted-foreground">Anyone in hiring team</span>
      ) : (
        <MemberAvatarStack members={activity.reviewers} memberMap={memberMap} />
      )}
    </>
  );
}

function RequiredReviewIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground"
            aria-label="Required activity"
          >
            <LockIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This review is required for the Application Review stage and cannot be deleted.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface MemberAvatarStackProps {
  members: {
    userId: string;
    name: string | null;
    email: string | null;
    isActive: boolean;
  }[];
  memberMap: ReadonlyMap<string, MemberDisplayIdentity>;
}

function MemberAvatarStack({ members, memberMap }: MemberAvatarStackProps) {
  const visible = members.slice(0, VISIBLE_AVATARS);
  const overflowCount = Math.max(0, members.length - VISIBLE_AVATARS);

  return (
    <TooltipProvider>
      <div className="flex items-center [&>*+*]:-ml-2">
        {visible.map((entry) => {
          const member = memberMap.get(entry.userId);
          const identity = {
            name: entry.name ?? member?.name,
            email: entry.email ?? member?.email,
          };
          const tooltipLabel = getActivityMemberLabel(identity, entry.isActive);

          return (
            <Tooltip key={entry.userId}>
              <TooltipTrigger asChild>
                <div className="ring-2 ring-background rounded-full">
                  <InitialsAvatar identity={identity} size="sm" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltipLabel}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {overflowCount > 0 && (
          <div className="size-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[10px] text-muted-foreground">
            +{overflowCount}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function getActivityMemberLabel(identity: MemberDisplayIdentity, isActive: boolean): string {
  const displayName = identity.name || identity.email;

  if (!displayName) {
    return isActive ? 'Team member' : 'Former member';
  }

  if (!isActive) {
    return `${displayName} (former member)`;
  }

  return displayName;
}

function getActivityAccessibleName(activity: StageActivity): string {
  if (activity.activityType === 'schedule_interview') {
    return activity.interviewTitle;
  }

  if (activity.activityType === 'send_email') {
    return `Send ${activity.emailTemplateName}`;
  }

  return 'Application Review';
}
