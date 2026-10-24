import type { DisplayIdentity } from '@comitium/schemas/common';
import { ActivityEventRow } from '@comitium/ui/activity-feed';
import { formatInTimezone, formatRelativeTime } from '@comitium/ui/date';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { memo } from 'react';
import { MemberAvatar } from '@/components/user/member-avatar';
import type { ActivityFeedRow } from '@/lib/schemas/emails';
import { getActorDisplayName } from '@/lib/utils';

import { getEventLabel, isApplicantSubmission } from './event-labels';
import { getEventSubline } from './event-subline';

interface TimelineEventRowProps {
  event: ActivityFeedRow;
  selectedApplicationId: string | null;
  timeZone: string;
}

export const TimelineEventRow = memo(function TimelineEventRow({
  event,
  selectedApplicationId,
  timeZone,
}: TimelineEventRowProps) {
  if (event.payload.kind === 'email' || event.payload.kind === 'note') {
    return null;
  }

  const occurredAt = formatInTimezone(event.createdAt, timeZone, 'MMM d, yyyy · h:mm a (zzz)');
  const actor = isApplicantSubmission(event) ? null : getActorDisplayName(event.actor.name);

  return (
    <ActivityEventRow
      avatar={<MemberAvatar identity={toDisplayIdentity(event)} size="sm" className="shrink-0" />}
      label={getEventLabel(event)}
      actor={actor}
      subline={getEventSubline(event, selectedApplicationId) || null}
      time={
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 text-label-12 text-meta-foreground">{formatRelativeTime(event.createdAt)}</span>
          </TooltipTrigger>
          <TooltipContent side="top">{occurredAt}</TooltipContent>
        </Tooltip>
      }
    />
  );
});

function toDisplayIdentity(event: ActivityFeedRow): DisplayIdentity {
  return {
    name: event.actor.name,
    email: null,
    avatarUrl: event.actor.avatarUrl,
  };
}
