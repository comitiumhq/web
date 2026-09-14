import { type RefObject, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { getCalendarDisplayRange } from '../calendar-range';
import { renderCalendarEvent } from './event';
import { layoutOverlappingEvents } from './event-layout';
import type { CalendarProviderEvent } from './ilamy-adapter';
import { useCalendarGrid } from './use-calendar-grid';

interface ProviderEventsOverlayProps {
  calendarRef: RefObject<HTMLDivElement | null>;
  events: readonly CalendarProviderEvent[];
  resourceIds: readonly string[];
  timeZone: string;
  visibleDay: string;
}

export function ProviderEventsOverlay({
  calendarRef,
  events,
  resourceIds,
  timeZone,
  visibleDay,
}: ProviderEventsOverlayProps) {
  const calendarGrid = useCalendarGrid(calendarRef);
  const positionedEventsByResource = useMemo(() => {
    const range = getCalendarDisplayRange(visibleDay, timeZone);

    return new Map(
      resourceIds.map((resourceId) => [
        resourceId,
        layoutOverlappingEvents(
          events.filter((event) => event.resourceId === resourceId),
          range.start,
          range.end,
        ),
      ]),
    );
  }, [events, resourceIds, timeZone, visibleDay]);

  if (!calendarGrid || resourceIds.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="calendar-provider-events-layer pointer-events-none absolute inset-y-0 right-0 grid min-w-0 gap-px"
      style={{
        gridTemplateColumns: `repeat(${resourceIds.length}, minmax(var(--calendar-resource-min-width), 1fr))`,
      }}
    >
      {resourceIds.map((resourceId, resourceIndex) => (
        <div key={resourceId} className="relative min-w-0" style={{ gridColumn: resourceIndex + 1 }}>
          {(positionedEventsByResource.get(resourceId) ?? []).map((positionedEvent) => (
            <div
              key={positionedEvent.event.id}
              className="calendar-provider-event-position absolute min-w-0"
              style={{
                top: `${positionedEvent.topPercent}%`,
                height: `${positionedEvent.heightPercent}%`,
                left: `${(positionedEvent.laneIndex / positionedEvent.laneCount) * 100}%`,
                width: `${100 / positionedEvent.laneCount}%`,
              }}
            >
              {renderCalendarEvent(positionedEvent.event, timeZone)}
            </div>
          ))}
        </div>
      ))}
    </div>,
    calendarGrid,
  );
}
