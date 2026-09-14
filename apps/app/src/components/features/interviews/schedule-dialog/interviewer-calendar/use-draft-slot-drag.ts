import {
  type PointerEventHandler,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  getDraftMinutesFromPointer,
  getDraftTopPercent,
  getDroppedDraftSlot,
  getMinimumDraftMinutes,
  getZonedMinutes,
} from './draft-slot';
import { CALENDAR_DRAFT_TOP_PROPERTY, ILAMY_GRID_BODY_SELECTOR } from './ilamy-dom';

interface DraftSlotDragOptions {
  calendarRef: RefObject<HTMLDivElement | null>;
  value: string | null;
  timeZone: string;
  durationMinutes: number;
  onValueChange: (iso: string) => void;
  onPastSlot: () => void;
  isDropAllowed: (start: Date) => boolean;
  onDisallowedDrop: () => void;
}

interface DragState {
  readonly pointerId: number;
  readonly originClientY: number;
  readonly originMinutes: number;
  currentMinutes: number;
  readonly minimumMinutes: number;
  readonly gridHeight: number;
}

export interface DraftSlotPointerHandlers {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
}

function setDraftTop(calendar: HTMLDivElement | null, minutes: number) {
  calendar?.style.setProperty(CALENDAR_DRAFT_TOP_PROPERTY, `${getDraftTopPercent(minutes)}%`);
}

function restoreDraftTop(calendar: HTMLDivElement | null, value: string, timeZone: string) {
  setDraftTop(calendar, getZonedMinutes(value, timeZone));
}

function cancelScheduledUpdate(frameRef: RefObject<number | null>) {
  if (frameRef.current !== null) {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }
}

function rejectDraftDrop(calendar: HTMLDivElement | null, value: string, timeZone: string, notify?: () => void) {
  restoreDraftTop(calendar, value, timeZone);
  notify?.();
}

function releasePointer(element: HTMLElement, pointerId: number) {
  try {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // The browser may release the pointer before a cancelled gesture reaches React.
  }
}

function capturePointer(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // The browser may cancel the gesture before React handles pointer down.
  }
}

export function useDraftSlotDrag({
  calendarRef,
  value,
  timeZone,
  durationMinutes,
  onValueChange,
  onPastSlot,
  isDropAllowed,
  onDisallowedDrop,
}: DraftSlotDragOptions): DraftSlotPointerHandlers {
  const dragRef = useRef<DragState | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateDraftTop = useCallback(
    (minutes: number) => {
      cancelScheduledUpdate(animationFrameRef);
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setDraftTop(calendarRef.current, minutes);
        animationFrameRef.current = null;
      });
    },
    [calendarRef],
  );

  useEffect(() => {
    return () => cancelScheduledUpdate(animationFrameRef);
  }, []);

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, shouldCommit: boolean) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId || !value) {
        return;
      }

      cancelScheduledUpdate(animationFrameRef);
      dragRef.current = null;
      calendarRef.current?.removeAttribute('data-draft-dragging');
      releasePointer(event.currentTarget, event.pointerId);

      if (!shouldCommit) {
        rejectDraftDrop(calendarRef.current, value, timeZone);

        return;
      }

      const nextSlot = getDroppedDraftSlot(value, timeZone, drag.currentMinutes, durationMinutes);

      if (!nextSlot) {
        rejectDraftDrop(calendarRef.current, value, timeZone, onPastSlot);

        return;
      }

      if (!isDropAllowed(nextSlot.start)) {
        rejectDraftDrop(calendarRef.current, value, timeZone, onDisallowedDrop);

        return;
      }

      setDraftTop(calendarRef.current, nextSlot.minutes);

      if (nextSlot.value !== value) {
        onValueChange(nextSlot.value);
      }
    },
    [calendarRef, durationMinutes, isDropAllowed, onDisallowedDrop, onPastSlot, onValueChange, timeZone, value],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!value || event.button !== 0) {
        return;
      }

      const calendarGrid = event.currentTarget.closest<HTMLElement>(ILAMY_GRID_BODY_SELECTOR);

      if (!calendarGrid) {
        return;
      }

      const minimumMinutes = getMinimumDraftMinutes(value, timeZone, durationMinutes);

      if (minimumMinutes === null) {
        onPastSlot();

        return;
      }

      event.preventDefault();
      event.stopPropagation();
      capturePointer(event.currentTarget, event.pointerId);

      calendarRef.current?.setAttribute('data-draft-dragging', 'true');
      const originMinutes = getZonedMinutes(value, timeZone);

      dragRef.current = {
        pointerId: event.pointerId,
        originClientY: event.clientY,
        originMinutes,
        currentMinutes: originMinutes,
        minimumMinutes,
        gridHeight: calendarGrid.getBoundingClientRect().height,
      };
    },
    [calendarRef, durationMinutes, onPastSlot, timeZone, value],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const nextMinutes = getDraftMinutesFromPointer(
        drag.originMinutes,
        event.clientY - drag.originClientY,
        drag.gridHeight,
        durationMinutes,
        drag.minimumMinutes,
      );

      drag.currentMinutes = nextMinutes;
      updateDraftTop(nextMinutes);
    },
    [durationMinutes, updateDraftTop],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => finishDrag(event, true), [finishDrag]);
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => finishDrag(event, false),
    [finishDrag],
  );

  return useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }),
    [onPointerCancel, onPointerDown, onPointerMove, onPointerUp],
  );
}
