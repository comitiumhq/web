import { describe, expect, it } from 'vitest';
import { layoutOverlappingEvents } from './event-layout';
import type { CalendarProviderEvent } from './ilamy-adapter';

const RESOURCE_ID = 'interviewer-1';
const RANGE_START = new Date('2026-09-14T06:00:00.000Z');
const RANGE_END = new Date('2026-09-14T18:00:00.000Z');

function createEvent(id: string, start: string, end: string): CalendarProviderEvent {
  return {
    id,
    title: id,
    start: new Date(start),
    end: new Date(end),
    resourceId: RESOURCE_ID,
    data: { type: 'busy', titleHidden: false },
  };
}

describe('layoutOverlappingEvents', () => {
  it('assigns equal lanes to simultaneous events', () => {
    const events = [
      createEvent('standup', '2026-09-14T07:00:00.000Z', '2026-09-14T08:00:00.000Z'),
      createEvent('product-sync', '2026-09-14T07:15:00.000Z', '2026-09-14T08:15:00.000Z'),
      createEvent('engineering-huddle', '2026-09-14T07:30:00.000Z', '2026-09-14T08:30:00.000Z'),
    ];

    const layout = layoutOverlappingEvents(events, RANGE_START, RANGE_END);

    expect(layout.map(({ laneIndex, laneCount }) => ({ laneIndex, laneCount }))).toEqual([
      { laneIndex: 0, laneCount: 3 },
      { laneIndex: 1, laneCount: 3 },
      { laneIndex: 2, laneCount: 3 },
    ]);
  });

  it('reuses a lane when events only touch at their boundaries', () => {
    const events = [
      createEvent('first', '2026-09-14T07:00:00.000Z', '2026-09-14T07:30:00.000Z'),
      createEvent('second', '2026-09-14T07:30:00.000Z', '2026-09-14T08:00:00.000Z'),
    ];

    const layout = layoutOverlappingEvents(events, RANGE_START, RANGE_END);

    expect(layout.map(({ laneIndex, laneCount }) => ({ laneIndex, laneCount }))).toEqual([
      { laneIndex: 0, laneCount: 1 },
      { laneIndex: 0, laneCount: 1 },
    ]);
  });

  it('clips events to the visible calendar range', () => {
    const event = createEvent('early', '2026-09-14T05:30:00.000Z', '2026-09-14T06:30:00.000Z');

    const [layout] = layoutOverlappingEvents([event], RANGE_START, RANGE_END);

    expect(layout?.topPercent).toBe(0);
    expect(layout?.heightPercent).toBeCloseTo(100 / 24);
  });
});
