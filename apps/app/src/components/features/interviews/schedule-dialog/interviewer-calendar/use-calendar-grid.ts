import { type RefObject, useEffect, useState } from 'react';

import { ILAMY_GRID_BODY_SELECTOR } from './ilamy-dom';

export function useCalendarGrid(calendarRef: RefObject<HTMLDivElement | null>, enabled = true) {
  const [calendarGrid, setCalendarGrid] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCalendarGrid(null);

      return;
    }

    const calendar = calendarRef.current;

    if (!calendar) {
      return;
    }

    const updateCalendarGrid = () => {
      const nextCalendarGrid = calendar.querySelector<HTMLElement>(ILAMY_GRID_BODY_SELECTOR);

      setCalendarGrid((currentCalendarGrid) =>
        currentCalendarGrid === nextCalendarGrid ? currentCalendarGrid : nextCalendarGrid,
      );
    };

    updateCalendarGrid();

    const observer = new MutationObserver(updateCalendarGrid);
    observer.observe(calendar, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [calendarRef, enabled]);

  return calendarGrid;
}
