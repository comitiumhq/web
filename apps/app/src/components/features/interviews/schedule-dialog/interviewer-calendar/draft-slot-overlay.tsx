import { getMemberDisplayName } from '@comitium/ui/display-name';
import { WarningIcon } from '@phosphor-icons/react';
import { addMinutes } from 'date-fns';
import { type RefObject, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

import type { SelectedInterviewer } from '../../types';
import { formatCalendarTimeRange } from './event';
import { useCalendarGrid } from './use-calendar-grid';
import type { DraftSlotPointerHandlers } from './use-draft-slot-drag';

interface DraftSlotOverlayProps extends DraftSlotPointerHandlers {
  calendarRef: RefObject<HTMLDivElement | null>;
  interviewers: readonly SelectedInterviewer[];
  conflictingResourceIds: ReadonlySet<string>;
  draftStart: Date | null;
  durationMinutes: number;
  timeZone: string;
  title: string;
  visible: boolean;
}

export function DraftSlotOverlay({
  calendarRef,
  interviewers,
  conflictingResourceIds,
  draftStart,
  durationMinutes,
  timeZone,
  title,
  visible,
  ...pointerHandlers
}: DraftSlotOverlayProps) {
  const calendarGrid = useCalendarGrid(calendarRef, visible);

  const timeRange = useMemo(() => {
    if (!draftStart) {
      return null;
    }

    return formatCalendarTimeRange(draftStart, addMinutes(draftStart, durationMinutes), timeZone);
  }, [draftStart, durationMinutes, timeZone]);

  if (!calendarGrid || !draftStart || !timeRange || !visible) {
    return null;
  }

  const conflictingInterviewers = interviewers.filter((interviewer) => conflictingResourceIds.has(interviewer.userId));
  const conflictNames = conflictingInterviewers.map((interviewer) => getMemberDisplayName(interviewer.member));
  const conflictDescription = conflictNames.length > 0 ? ` Availability conflict for ${conflictNames.join(', ')}.` : '';

  return createPortal(
    <fieldset
      aria-label={`Selected interview slot: ${title}, ${timeRange}.${conflictDescription}`}
      data-conflict={conflictingInterviewers.length > 0 ? 'true' : undefined}
      className="calendar-draft-slot absolute right-0 grid min-w-0 touch-none cursor-grab select-none overflow-clip rounded-md border-0 p-0 text-primary shadow-sm active:cursor-grabbing"
      style={{
        gridTemplateColumns: `repeat(${interviewers.length}, minmax(var(--calendar-resource-min-width), 1fr))`,
      }}
      {...pointerHandlers}
    >
      {interviewers.map((interviewer, index) => {
        const conflicting = conflictingResourceIds.has(interviewer.userId);
        const previousConflicting = index > 0 && conflictingResourceIds.has(interviewers[index - 1]?.userId ?? '');
        const nextConflicting =
          index < interviewers.length - 1 && conflictingResourceIds.has(interviewers[index + 1]?.userId ?? '');
        const interviewerName = getMemberDisplayName(interviewer.member);
        const isFirstInterviewer = index === 0;
        const isLastInterviewer = index === interviewers.length - 1;
        const startsVisualSegment = conflicting ? !previousConflicting : isFirstInterviewer;
        const endsVisualSegment = conflicting ? !nextConflicting : isLastInterviewer;

        return (
          <div
            key={interviewer.userId}
            aria-hidden={conflicting ? undefined : true}
            className={cn('relative z-10 flex min-w-0 items-center border-y', {
              'justify-end gap-1 border-warning/50 bg-warning/10 px-2 text-warning-text': conflicting,
              'border-primary/65 bg-primary/10': !conflicting,
              'border-l': startsVisualSegment,
              'border-r': endsVisualSegment,
              'ml-1 rounded-l-md': isFirstInterviewer,
              'mr-2 rounded-r-md': isLastInterviewer,
            })}
            style={{ gridColumn: index + 1, gridRow: 1 }}
            title={conflicting ? `Availability conflict for ${interviewerName}` : undefined}
          >
            {conflicting && (
              <>
                <WarningIcon className="size-3.5 shrink-0" />
                <span className="calendar-event-caption truncate font-medium">Conflict</span>
              </>
            )}
          </div>
        );
      })}

      <div className="calendar-draft-slot-label pointer-events-none absolute inset-0 z-20 min-w-0 px-2 py-1 text-label-12 leading-tight">
        <span className="calendar-draft-slot-label-content sticky flex w-fit max-w-full min-w-0 flex-col items-start rounded-md bg-primary px-2 py-1 text-primary-foreground shadow-sm">
          <span className="min-w-0 max-w-full truncate font-medium">{title}</span>
          <span className="calendar-draft-slot-time calendar-event-caption max-w-full truncate font-normal text-primary-foreground/80">
            {timeRange}
          </span>
        </span>
      </div>
    </fieldset>,
    calendarGrid,
  );
}
