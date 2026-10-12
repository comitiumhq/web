import { KANBAN_CARD_SURFACE_CLASS, KanbanCardBody } from '@comitium/ui/kanban';
import { useSortable } from '@dnd-kit/react/sortable';
import { type MouseEvent, memo, type PointerEvent, useCallback, useRef } from 'react';
import { getActivityBadge } from '@/components/features/application-status';
import type { KanbanApplication } from '@/lib/schemas/pipeline';
import { cn, formatElapsedDaysSince, getCandidateDisplayName } from '@/lib/utils';

import { getCardUrgencyState, toCardStatusInput } from './pipeline-status';
import { UrgencyStripe } from './urgency-stripe';

const CLICK_DRAG_THRESHOLD_PX = 6;

interface PointerStart {
  x: number;
  y: number;
}

interface KanbanCardProps {
  application: KanbanApplication;
  index: number;
  column: string;
  decryptedName: string | null;
  company: string | null;
  onCardClick: (application: KanbanApplication) => void;
}

export const KanbanCard = memo(function KanbanCard({
  application,
  index,
  column,
  decryptedName,
  company,
  onCardClick,
}: KanbanCardProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: application.id,
    index,
    group: column,
    type: 'item',
    accept: 'item',
    feedback: 'clone',
    data: { group: column },
  });
  const pointerStartRef = useRef<PointerStart | null>(null);
  const suppressClickRef = useRef(false);

  const statusInput = toCardStatusInput(application);

  const activityBadge = getActivityBadge(statusInput);
  const { level: urgency, reason: urgencyTitle } = getCardUrgencyState(statusInput);
  const stageElapsed = formatElapsedDaysSince(statusInput.stageSince);

  const setCardRef = useCallback(
    (node: HTMLButtonElement | null) => {
      ref(node);
      handleRef(node);
    },
    [ref, handleRef],
  );

  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    suppressClickRef.current = false;
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current;

    if (!start) {
      return;
    }

    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);

    if (distance >= CLICK_DRAG_THRESHOLD_PX) {
      suppressClickRef.current = true;
    }
  }, []);

  const handlePointerEnd = useCallback(() => {
    pointerStartRef.current = null;
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (event.defaultPrevented || isDragging || suppressClickRef.current) {
        event.preventDefault();
        suppressClickRef.current = false;

        return;
      }

      onCardClick(application);
    },
    [isDragging, onCardClick, application],
  );

  const displayName = getCandidateDisplayName({
    applicationId: application.id,
    candidateId: application.candidateId,
    fallbackName: decryptedName,
  });

  return (
    <button
      type="button"
      ref={setCardRef}
      aria-label={`Open candidate ${displayName}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={handleClick}
      className={cn(
        KANBAN_CARD_SURFACE_CLASS,
        'cursor-grab outline-none transition-[background-color,border-color,box-shadow,opacity] duration-150 ease-out active:cursor-grabbing motion-reduce:transition-none',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-kanban-canvas',
        'data-[dnd-placeholder=clone]:opacity-40 data-[dnd-placeholder=clone]:shadow-none data-[dnd-placeholder=clone]:ring-0',
        {
          'hover:border-input hover:shadow-sm': !isDragging,
          'z-50 cursor-grabbing border-primary/35 opacity-95 shadow-xl ring-1 ring-primary/25': isDragging,
        },
      )}
    >
      <KanbanCardBody
        name={displayName}
        company={company}
        status={activityBadge}
        footer={stageElapsed ? `In stage ${stageElapsed}` : null}
      />
      <UrgencyStripe level={urgency} reason={urgencyTitle} side="left" />
    </button>
  );
});
