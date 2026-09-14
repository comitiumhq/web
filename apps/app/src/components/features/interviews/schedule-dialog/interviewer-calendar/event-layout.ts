import type { CalendarProviderEvent } from './ilamy-adapter';

interface VisibleEvent {
  event: CalendarProviderEvent;
  startTime: number;
  endTime: number;
}

export interface PositionedCalendarEvent {
  event: CalendarProviderEvent;
  laneIndex: number;
  laneCount: number;
  topPercent: number;
  heightPercent: number;
}

export function layoutOverlappingEvents(
  events: readonly CalendarProviderEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): PositionedCalendarEvent[] {
  const rangeStartTime = rangeStart.getTime();
  const rangeEndTime = rangeEnd.getTime();
  const rangeDuration = rangeEndTime - rangeStartTime;

  if (rangeDuration <= 0) {
    return [];
  }

  const visibleEvents = events
    .map((event): VisibleEvent | null => {
      const startTime = Math.max(event.start.getTime(), rangeStartTime);
      const endTime = Math.min(event.end.getTime(), rangeEndTime);

      return endTime > startTime ? { event, startTime, endTime } : null;
    })
    .filter((event): event is VisibleEvent => event !== null)
    .sort((left, right) => left.startTime - right.startTime || right.endTime - left.endTime);

  const positionedEvents: PositionedCalendarEvent[] = [];
  let cluster: VisibleEvent[] = [];
  let clusterEndTime = Number.NEGATIVE_INFINITY;

  const positionCluster = () => {
    if (cluster.length === 0) {
      return;
    }

    const laneEndTimes: number[] = [];
    const laneAssignments = cluster.map((visibleEvent) => {
      let laneIndex = laneEndTimes.findIndex((laneEndTime) => laneEndTime <= visibleEvent.startTime);

      if (laneIndex === -1) {
        laneIndex = laneEndTimes.length;
        laneEndTimes.push(visibleEvent.endTime);
      } else {
        laneEndTimes[laneIndex] = visibleEvent.endTime;
      }

      return { visibleEvent, laneIndex };
    });

    const laneCount = laneEndTimes.length;

    for (const { visibleEvent, laneIndex } of laneAssignments) {
      positionedEvents.push({
        event: visibleEvent.event,
        laneIndex,
        laneCount,
        topPercent: ((visibleEvent.startTime - rangeStartTime) / rangeDuration) * 100,
        heightPercent: ((visibleEvent.endTime - visibleEvent.startTime) / rangeDuration) * 100,
      });
    }
  };

  for (const visibleEvent of visibleEvents) {
    if (cluster.length > 0 && visibleEvent.startTime >= clusterEndTime) {
      positionCluster();
      cluster = [];
    }

    cluster.push(visibleEvent);
    clusterEndTime = Math.max(clusterEndTime, visibleEvent.endTime);
  }

  positionCluster();

  return positionedEvents;
}
