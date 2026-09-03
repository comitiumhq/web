import { formatInTimezone } from '@comitium/ui/date';
import type { CalendarEvent } from '@ilamy/calendar';
import { addMinutes } from 'date-fns';
import { createContext, type PropsWithChildren, useContext } from 'react';
import { cn } from '@/lib/utils';

import type { CalendarEventData } from './ilamy-adapter';
import type { DraftSlotPointerHandlers } from './use-draft-slot-drag';

interface CalendarEventContextValue extends DraftSlotPointerHandlers {
  title: string;
  draftStart: Date | null;
  durationMinutes: number;
  timeZone: string;
  conflictingResourceIds: ReadonlySet<string>;
  visible: boolean;
}

const CalendarEventContext = createContext<CalendarEventContextValue | null>(null);

interface CalendarEventProviderProps extends PropsWithChildren {
  value: CalendarEventContextValue;
}

export function CalendarEventProvider({ value, children }: CalendarEventProviderProps) {
  return <CalendarEventContext.Provider value={value}>{children}</CalendarEventContext.Provider>;
}

function formatTimeRange(start: Date, end: Date, timeZone: string) {
  return `${formatInTimezone(start, timeZone, 'h:mm a')} – ${formatInTimezone(end, timeZone, 'h:mm a')}`;
}

function BusyEvent({ event, titleHidden }: { event: CalendarEvent; titleHidden: boolean }) {
  const context = useContext(CalendarEventContext);
  const title = titleHidden ? 'Busy' : event.title;
  const timeRange = context ? formatTimeRange(event.start.toDate(), event.end.toDate(), context.timeZone) : null;

  return (
    <div className="pointer-events-none flex h-full w-full select-none flex-col justify-center overflow-hidden rounded-sm border border-border bg-muted/70 px-1.5 py-1 text-label-12 leading-tight">
      <span className={cn('truncate font-medium text-foreground', titleHidden && 'italic text-muted-foreground')}>
        {title}
      </span>
      {timeRange && <span className="truncate text-[10px] text-muted-foreground">{timeRange}</span>}
    </div>
  );
}

export function renderEvent(event: CalendarEvent) {
  const data = event.data as CalendarEventData | undefined;

  if (data?.type === 'draft') {
    return <DraftEvent event={event} />;
  }

  return <BusyEvent event={event} titleHidden={data?.type === 'busy' && data.titleHidden} />;
}

function DraftEvent({ event }: { event: CalendarEvent }) {
  const context = useContext(CalendarEventContext);
  const resourceId = String(event.resourceId ?? '');
  const hasConflict = context?.conflictingResourceIds.has(resourceId) ?? false;
  const timeRange = context?.draftStart
    ? formatTimeRange(context.draftStart, addMinutes(context.draftStart, context.durationMinutes), context.timeZone)
    : null;

  return (
    <div
      aria-hidden={!context?.visible}
      data-conflict={hasConflict ? 'true' : undefined}
      data-testid="calendar-draft-event"
      className={cn(
        'calendar-draft-event h-full w-full touch-none select-none overflow-hidden rounded-sm border px-1.5 py-1 text-label-12 font-medium leading-tight',
        hasConflict
          ? 'border-warning/60 bg-warning/5 text-warning-text'
          : 'border-primary/50 bg-primary/5 text-primary',
      )}
      onPointerDown={context?.onPointerDown}
      onPointerMove={context?.onPointerMove}
      onPointerUp={context?.onPointerUp}
      onPointerCancel={context?.onPointerCancel}
    >
      <span className="block truncate">{context?.title ?? event.title}</span>
      {timeRange && <span className="block truncate text-[10px] font-normal">{timeRange}</span>}
      {hasConflict && <span className="block truncate text-[10px] font-normal">Availability conflict</span>}
    </div>
  );
}
