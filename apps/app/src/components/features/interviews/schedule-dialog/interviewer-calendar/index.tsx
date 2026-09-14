import { getMemberDisplayName } from '@comitium/ui/display-name';
import { EmptyState } from '@comitium/ui/empty-state';
import { type CellInfo, IlamyCalendar, type IlamyCalendarProps, type Resource } from '@ilamy/calendar';
import { CalendarDotsIcon, SpinnerGapIcon, UserPlusIcon } from '@phosphor-icons/react';
import { parseISO } from 'date-fns';
import {
  type CSSProperties,
  memo,
  type PointerEventHandler,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { useQueryInterviewBusy } from '@/hooks/queries/use-query-interview-busy';
import { useQueryOrgTeam, useQueryTeamCalendarStatusMap } from '@/hooks/queries/use-query-org-team';
import { cn } from '@/lib/utils';

import type { SelectedInterviewer } from '../../types';
import {
  CALENDAR_GRID_SLOT_MINUTES,
  CALENDAR_START_MINUTES,
  getAvailabilityRange,
  getCalendarDate,
  isCalendarSlotVisible,
} from '../calendar-range';
import {
  areInterviewersWorkingDuring,
  createAvailabilityIndex,
  getConflictingInterviewerIds,
  hasCompleteInterviewerAvailability,
  isInterviewerWorkingDuring,
} from './availability';
import { ResourceColumn } from './column';
import {
  getDraftHeightPercent,
  getDraftTopPercent,
  getPointerSlotStart,
  getZonedMinutes,
  isFutureSlot,
} from './draft-slot';
import { DraftSlotOverlay } from './draft-slot-overlay';
import { CalendarHeader, CalendarHeaderEmpty } from './header';
import {
  BUSINESS_HOURS,
  type CalendarResourceData,
  createCalendarEvents,
  createCalendarResources,
} from './ilamy-adapter';
import { CALENDAR_DRAFT_HEIGHT_PROPERTY, CALENDAR_DRAFT_TOP_PROPERTY, ILAMY_VERTICAL_CELL_SELECTOR } from './ilamy-dom';
import { ProviderEventsOverlay } from './provider-events-overlay';
import { useDraftSlotDrag } from './use-draft-slot-drag';
import './interviewer-calendar.css';

const CALENDAR_CLASSES: NonNullable<IlamyCalendarProps['classesOverride']> = {
  disabledCell: 'bg-muted/20 text-muted-foreground pointer-events-none',
};

const StaticIlamyCalendar = memo(IlamyCalendar);
const EMPTY_CALENDAR_EVENTS: NonNullable<IlamyCalendarProps['events']> = [];
const EMPTY_RESOURCE_IDS: ReadonlySet<string> = new Set();

function showPastSlotError() {
  toast.error('Pick a future time slot');
}

function showOutsideWorkingHoursError() {
  toast.error("Pick a time within every interviewer's working hours");
}

interface AvailabilityUnavailableProps {
  className: string;
  description: string;
  header: ReactNode;
}

function AvailabilityUnavailable({ className, description, header }: AvailabilityUnavailableProps) {
  return (
    <div className={cn('interviewer-calendar flex flex-col overflow-hidden', className)}>
      {header}
      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border bg-card">
        <EmptyState icon={CalendarDotsIcon} title="Availability unavailable" description={description} />
      </div>
    </div>
  );
}

type VisibleDate = Parameters<NonNullable<IlamyCalendarProps['onDateChange']>>[0];
type CalendarStyle = CSSProperties & {
  [CALENDAR_DRAFT_HEIGHT_PROPERTY]: string;
  [CALENDAR_DRAFT_TOP_PROPERTY]: string;
};

interface InterviewerCalendarProps {
  applicationId: string;
  orgId: string;
  interviewTypeControl?: ReactNode;
  interviewers: SelectedInterviewer[];
  onInterviewersChange?: (next: SelectedInterviewer[]) => void;
  timeZone: string;
  onTimeZoneChange: (tz: string) => void;
  value: string | null;
  onValueChange: (iso: string | null) => void;
  durationMinutes: number;
  draftEventTitle: string;
  hasInterviewType: boolean;
  visibleDay: string;
  onVisibleDayChange: (day: string) => void;
  className: string;
}

function InterviewerCalendarImpl({
  applicationId,
  orgId,
  interviewTypeControl,
  interviewers,
  onInterviewersChange,
  timeZone,
  onTimeZoneChange,
  value,
  onValueChange,
  durationMinutes,
  draftEventTitle,
  hasInterviewType,
  visibleDay,
  onVisibleDayChange,
  className,
}: InterviewerCalendarProps) {
  const lockInterviewers = !onInterviewersChange;
  const calendarRef = useRef<HTMLDivElement>(null);
  const pointerSlotRef = useRef<Date | null>(null);
  const [interviewerPickerOpen, setInterviewerPickerOpen] = useState(false);

  const { data: orgMembers } = useQueryOrgTeam(orgId);
  const calendarStatusMap = useQueryTeamCalendarStatusMap(orgId);

  const interviewerUserIds = useMemo(() => interviewers.map((interviewer) => interviewer.userId), [interviewers]);
  const availabilityRange = useMemo(() => getAvailabilityRange(visibleDay, timeZone), [timeZone, visibleDay]);

  const availabilityQuery = useQueryInterviewBusy({
    applicationId,
    interviewerUserIds,
    startTime: availabilityRange.start,
    endTime: availabilityRange.end,
    timeZone,
  });

  const interviewerAvailability = availabilityQuery.data?.data.interviewers;
  const availabilityIsPending = availabilityQuery.isPending || availabilityQuery.isPlaceholderData;
  const hasCompleteAvailability = hasCompleteInterviewerAvailability(interviewerAvailability, interviewerUserIds);

  const handleRemove = useCallback(
    (userId: string) => {
      if (!onInterviewersChange) {
        return;
      }

      onInterviewersChange(interviewers.filter((interviewer) => interviewer.userId !== userId));
    },
    [interviewers, onInterviewersChange],
  );

  const resources = useMemo(() => createCalendarResources(interviewers), [interviewers]);

  const availabilityIndex = useMemo(() => createAvailabilityIndex(interviewerAvailability), [interviewerAvailability]);

  const events = useMemo(() => createCalendarEvents(availabilityIndex), [availabilityIndex]);

  const calendarInitialDate = useMemo(() => getCalendarDate(visibleDay, timeZone), [timeZone, visibleDay]);

  const unavailableInterviewers =
    interviewerAvailability?.filter((interviewer) => interviewer.status === 'unavailable') ?? [];
  const availabilityFailed = !availabilityIsPending && (availabilityQuery.isError || !hasCompleteAvailability);
  const availabilityUnavailable = !availabilityIsPending && unavailableInterviewers.length > 0;

  const isSlotWithinWorkingHours = useCallback(
    (start: Date) => areInterviewersWorkingDuring(availabilityIndex, interviewerUserIds, start, durationMinutes),
    [availabilityIndex, durationMinutes, interviewerUserIds],
  );

  const isCellOutsideWorkingHours = useCallback(
    (info: CellInfo) => {
      if (info.allDay || !info.resource) {
        return false;
      }

      return !isInterviewerWorkingDuring(
        availabilityIndex,
        String(info.resource.id),
        info.start.toDate(),
        durationMinutes,
      );
    },
    [availabilityIndex, durationMinutes],
  );

  const handleCellClick = useCallback(
    (info: CellInfo) => {
      const pointerSlot = pointerSlotRef.current;
      const start = pointerSlot ?? info.start.toDate();

      pointerSlotRef.current = null;

      if (!isFutureSlot(start)) {
        showPastSlotError();

        return;
      }

      if (!isSlotWithinWorkingHours(start)) {
        showOutsideWorkingHoursError();

        return;
      }

      onValueChange(start.toISOString());
    },
    [isSlotWithinWorkingHours, onValueChange],
  );

  const handlePointerDownCapture = useCallback<PointerEventHandler<HTMLDivElement>>((event) => {
    if (event.button !== 0 || !(event.target instanceof Element)) {
      pointerSlotRef.current = null;

      return;
    }

    const cell = event.target.closest<HTMLElement>(ILAMY_VERTICAL_CELL_SELECTOR);
    const cellStart = cell?.dataset.start;

    if (!cell || !cellStart || cell.dataset.disabled === 'true') {
      pointerSlotRef.current = null;

      return;
    }

    const cellBounds = cell.getBoundingClientRect();

    pointerSlotRef.current = getPointerSlotStart(
      new Date(cellStart),
      event.clientY - cellBounds.top,
      cellBounds.height,
    );
  }, []);

  const handleDateChange = useCallback(
    (date: VisibleDate) => {
      onVisibleDayChange(date.format('YYYY-MM-DD'));
    },
    [onVisibleDayChange],
  );

  const renderResource = useCallback(
    (resource: Resource) => {
      const data = resource.data as CalendarResourceData;

      return (
        <ResourceColumn
          userId={resource.id as string}
          identity={data.identity}
          timeZone={data.timeZone}
          title={resource.title}
          onRemove={lockInterviewers ? undefined : handleRemove}
        />
      );
    },
    [handleRemove, lockInterviewers],
  );

  const calendarHeader = useMemo(
    () => (
      <CalendarHeader
        interviewTypeControl={interviewTypeControl}
        members={orgMembers ?? []}
        calendarStatusMap={calendarStatusMap}
        interviewers={interviewers}
        onInterviewersChange={onInterviewersChange}
        interviewerPickerOpen={interviewerPickerOpen}
        onInterviewerPickerOpenChange={setInterviewerPickerOpen}
        timeZone={timeZone}
        onTimeZoneChange={onTimeZoneChange}
      />
    ),
    [
      calendarStatusMap,
      interviewTypeControl,
      interviewerPickerOpen,
      interviewers,
      onInterviewersChange,
      onTimeZoneChange,
      orgMembers,
      timeZone,
    ],
  );

  const fallbackHeader = (
    <CalendarHeaderEmpty
      interviewTypeControl={interviewTypeControl}
      members={orgMembers ?? []}
      calendarStatusMap={calendarStatusMap}
      interviewers={interviewers}
      onInterviewersChange={onInterviewersChange}
      interviewerPickerOpen={interviewerPickerOpen}
      onInterviewerPickerOpenChange={setInterviewerPickerOpen}
      timeZone={timeZone}
      onTimeZoneChange={onTimeZoneChange}
      canAddInterviewer={hasInterviewType}
    />
  );

  const draftStart = useMemo(() => (value ? parseISO(value) : null), [value]);
  const conflictingResourceIds = useMemo(() => {
    if (!draftStart) {
      return EMPTY_RESOURCE_IDS;
    }

    return getConflictingInterviewerIds(availabilityIndex, interviewerUserIds, draftStart, durationMinutes);
  }, [availabilityIndex, draftStart, durationMinutes, interviewerUserIds]);

  const draftVisible = value ? isCalendarSlotVisible({ value, availabilityRange, timeZone, durationMinutes }) : false;

  useEffect(() => {
    if (
      value &&
      (!draftVisible ||
        availabilityFailed ||
        availabilityUnavailable ||
        (draftStart && !availabilityIsPending && !isSlotWithinWorkingHours(draftStart)))
    ) {
      onValueChange(null);
    }
  }, [
    availabilityFailed,
    availabilityIsPending,
    availabilityUnavailable,
    draftStart,
    draftVisible,
    isSlotWithinWorkingHours,
    onValueChange,
    value,
  ]);

  const draftMinutes = value ? getZonedMinutes(value, timeZone) : CALENDAR_START_MINUTES;
  const calendarStyle: CalendarStyle = {
    [CALENDAR_DRAFT_HEIGHT_PROPERTY]: `${getDraftHeightPercent(durationMinutes)}%`,
    [CALENDAR_DRAFT_TOP_PROPERTY]: `${getDraftTopPercent(draftMinutes)}%`,
  };

  const draftPointerHandlers = useDraftSlotDrag({
    calendarRef,
    value,
    timeZone,
    durationMinutes,
    onValueChange,
    onPastSlot: showPastSlotError,
    isDropAllowed: isSlotWithinWorkingHours,
    onDisallowedDrop: showOutsideWorkingHoursError,
  });

  if (interviewers.length === 0) {
    return (
      <div className={cn('interviewer-calendar flex flex-col overflow-hidden', className)}>
        {fallbackHeader}
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border bg-card">
          {hasInterviewType ? (
            <EmptyState
              icon={UserPlusIcon}
              title="Add interviewers"
              description="Pick interviewers above to see their availability and choose a time slot."
            />
          ) : (
            <EmptyState
              icon={CalendarDotsIcon}
              title="Select an interview type"
              description="Choose an interview type above to start scheduling."
            />
          )}
        </div>
      </div>
    );
  }

  if (availabilityFailed) {
    return (
      <AvailabilityUnavailable
        className={className}
        header={fallbackHeader}
        description="Calendar availability could not be loaded. Try again before choosing a time."
      />
    );
  }

  if (availabilityUnavailable) {
    const unavailableUserIds = new Set(unavailableInterviewers.map((interviewer) => interviewer.userId));

    const unavailableNames = interviewers
      .filter((interviewer) => unavailableUserIds.has(interviewer.userId))
      .map((interviewer) => getMemberDisplayName(interviewer.member))
      .join(', ');

    const unavailableDescription = unavailableNames
      ? `Calendar availability is missing for: ${unavailableNames}. Check their connection and try again.`
      : 'One or more interviewer calendars are unavailable. Check their connection and try again.';

    return (
      <AvailabilityUnavailable className={className} header={fallbackHeader} description={unavailableDescription} />
    );
  }

  return (
    <div
      ref={calendarRef}
      className={cn('interviewer-calendar relative overflow-hidden', className)}
      data-draft-visible={draftVisible ? 'true' : 'false'}
      onPointerDownCapture={handlePointerDownCapture}
      style={calendarStyle}
    >
      <StaticIlamyCalendar
        orientation="vertical"
        initialView="day"
        initialDate={calendarInitialDate}
        resources={resources}
        events={EMPTY_CALENDAR_EVENTS}
        businessHours={BUSINESS_HOURS}
        hideNonBusinessHours
        slotDuration={CALENDAR_GRID_SLOT_MINUTES}
        timeFormat="12-hour"
        timezone={timeZone}
        headerComponent={calendarHeader}
        renderResource={renderResource}
        isCellDisabled={isCellOutsideWorkingHours}
        classesOverride={CALENDAR_CLASSES}
        eventSpacing={0}
        onCellClick={handleCellClick}
        onDateChange={handleDateChange}
        disableEventClick
        disableDragAndDrop
      />
      <ProviderEventsOverlay
        calendarRef={calendarRef}
        events={events}
        resourceIds={interviewerUserIds}
        timeZone={timeZone}
        visibleDay={visibleDay}
      />
      <DraftSlotOverlay
        calendarRef={calendarRef}
        interviewers={interviewers}
        conflictingResourceIds={conflictingResourceIds}
        draftStart={draftStart}
        durationMinutes={durationMinutes}
        timeZone={timeZone}
        title={draftEventTitle}
        visible={draftVisible}
        {...draftPointerHandlers}
      />
      <output className="sr-only" aria-live="polite">
        {draftStart ? `Selected ${draftEventTitle} at ${draftStart.toISOString()}.` : 'No interview time selected.'}
      </output>
      {(availabilityIsPending || availabilityQuery.isFetching) && (
        <output
          className="calendar-availability-loading absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
          aria-label={
            availabilityIsPending ? 'Loading interviewer availability' : 'Refreshing interviewer availability'
          }
        >
          <SpinnerGapIcon className="size-5 animate-spin text-muted-foreground" />
        </output>
      )}
    </div>
  );
}

export const InterviewerCalendar = memo(InterviewerCalendarImpl);
