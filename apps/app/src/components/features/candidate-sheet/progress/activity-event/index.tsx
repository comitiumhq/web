import type { DisplayIdentity } from '@comitium/schemas/common';
import { formatInTimezone, formatRelativeTime } from '@comitium/ui/date';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { memo } from 'react';
import type { ActivityFeedRow } from '@/lib/schemas/emails';
import { getActorDisplayName } from '@/lib/utils';

import { getEventLabel } from './event-labels';
import { getEventSubline } from './event-subline';

interface TimelineEventRowProps {
  event: ActivityFeedRow;
  selectedApplicationId: string | null;
  timeZone: string;
}

interface EventBodyProps {
  event: ActivityFeedRow;
  selectedApplicationId: string | null;
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

  return (
    <div className="flex items-start gap-2.5 px-1 py-2">
      <InitialsAvatar identity={toDisplayIdentity(event)} size="sm" className="mt-0.5 shrink-0" />
      <EventBody event={event} selectedApplicationId={selectedApplicationId} />
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="shrink-0 text-label-12 text-muted-foreground">{formatRelativeTime(event.createdAt)}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{occurredAt}</TooltipContent>
      </Tooltip>
    </div>
  );
});

function EventBody({ event, selectedApplicationId }: EventBodyProps) {
  const label = getEventLabel(event);
  const subline = getEventSubline(event, selectedApplicationId);
  const actor = getActorDisplayName(event.actor.name);

  return (
    <div className="flex-1 min-w-0">
      <span className="text-label-13">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground"> by {actor}</span>
      </span>
      {subline && <p className="text-label-12 text-muted-foreground mt-0.5">{subline}</p>}
    </div>
  );
}

function toDisplayIdentity(event: ActivityFeedRow): DisplayIdentity {
  return {
    walletAddress: event.actor.externalWallet ?? '',
    name: event.actor.name,
    email: null,
  };
}
