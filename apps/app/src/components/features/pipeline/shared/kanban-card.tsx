import { StatusBadge, type StatusBadgeProps } from '@comitium/ui/status-badge';
import { useSortable } from '@dnd-kit/react/sortable';
import { type MouseEvent, memo, type PointerEvent, useCallback, useRef } from 'react';
import { getActivityBadge, getResponseDeadlineBadge } from '@/components/features/application-status';
import type { KanbanApplication } from '@/lib/schemas/pipeline';
import { cn, formatElapsedDaysSince, getCandidateDisplayName } from '@/lib/utils';

import { getCardUrgencyState, toCardStatusInput } from './pipeline-status';
import { UrgencyStripe } from './urgency-stripe';

const CLICK_DRAG_THRESHOLD_PX = 6;

const DEADLINE_TEXT_COLOR: Partial<Record<NonNullable<StatusBadgeProps['variant']>, string>> = {
  destructive: 'text-destructive-text',
  warning: 'text-warning-text',
};

function getDeadlineColor(badge: StatusBadgeProps | null): string {
  if (!badge?.variant) {
    return 'text-muted-foreground';
  }

  return DEADLINE_TEXT_COLOR[badge.variant] ?? 'text-muted-foreground';
}

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
  const deadlineBadge = getResponseDeadlineBadge(application.isResponded, application.responseDeadline);
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
  const deadlineColor = getDeadlineColor(deadlineBadge);

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
        'relative flex h-30 w-full shrink-0 cursor-grab flex-col overflow-hidden rounded-xl border border-transparent bg-card bg-clip-padding p-3 text-left outline-none transition-[background-color,border-color,box-shadow,opacity] duration-150 ease-out active:cursor-grabbing motion-reduce:transition-none',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-kanban-canvas',
        'data-[dnd-placeholder=clone]:opacity-40 data-[dnd-placeholder=clone]:shadow-none data-[dnd-placeholder=clone]:ring-0',
        {
          'hover:border-input hover:shadow-sm': !isDragging,
          'z-50 cursor-grabbing border-primary/35 opacity-95 shadow-xl ring-1 ring-primary/25': isDragging,
        },
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-heading-14 text-foreground">{displayName}</p>
        {company && <p className="mt-0.5 truncate text-label-12 text-muted-foreground">{company}</p>}
      </div>

      {activityBadge && (
        <div className="mt-2.5 flex">
          <StatusBadge {...activityBadge} />
        </div>
      )}

      {(stageElapsed || deadlineBadge || application.duplicateAttemptCount > 0) && (
        <p className="mt-auto pt-2 text-label-12 tabular-nums text-muted-foreground">
          {stageElapsed && <span>In stage {stageElapsed}</span>}
          {stageElapsed && deadlineBadge && <span> · </span>}
          {deadlineBadge && <span className={deadlineColor}>{deadlineBadge.label}</span>}
          {(stageElapsed || deadlineBadge) && application.duplicateAttemptCount > 0 && <span> · </span>}
          {application.duplicateAttemptCount > 0 && (
            <span>
              {application.duplicateAttemptCount + 1} attempt{application.duplicateAttemptCount === 0 ? '' : 's'}
            </span>
          )}
        </p>
      )}
      <UrgencyStripe level={urgency} reason={urgencyTitle} side="left" />
    </button>
  );
});
