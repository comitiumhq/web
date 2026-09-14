import { formatInTimezone } from '@comitium/ui/date';

import type { CalendarProviderEvent } from './ilamy-adapter';

export function formatCalendarTimeRange(start: Date, end: Date, timeZone: string) {
  return `${formatInTimezone(start, timeZone, 'h:mm a')} – ${formatInTimezone(end, timeZone, 'h:mm a')}`;
}

function BusyEvent({ event, timeZone }: { event: CalendarProviderEvent; timeZone: string }) {
  const titleHidden = event.data.titleHidden;
  const title = titleHidden ? 'Busy' : event.title;
  const timeRange = formatCalendarTimeRange(event.start, event.end, timeZone);

  return (
    <div className="calendar-provider-event pointer-events-none h-full w-full select-none overflow-hidden rounded-md bg-foreground/6 px-2 py-1 text-label-12 leading-tight">
      <div className="calendar-provider-event-content flex min-w-0 flex-col items-start">
        <span className="min-w-0 max-w-full truncate font-medium text-foreground/85">{title}</span>
        <span className="calendar-provider-event-time calendar-event-caption max-w-full truncate text-muted-foreground">
          {timeRange}
        </span>
      </div>
    </div>
  );
}

export function renderCalendarEvent(event: CalendarProviderEvent, timeZone: string) {
  return <BusyEvent event={event} timeZone={timeZone} />;
}
