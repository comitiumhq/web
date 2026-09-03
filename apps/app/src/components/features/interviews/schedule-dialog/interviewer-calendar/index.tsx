import { getMemberDisplayName } from '@comitium/ui/display-name';
import { EmptyState } from '@comitium/ui/empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { type CellInfo, IlamyCalendar, type IlamyCalendarProps, type Resource } from '@ilamy/calendar';
import { CalendarDotsIcon, SpinnerGapIcon, UserPlusIcon } from '@phosphor-icons/react';
import { parseISO } from 'date-fns';
import { type CSSProperties, memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useQueryInterviewBusy } from '@/hooks/queries/use-query-interview-busy';
import { useQueryOrgTeam, useQueryTeamCalendarStatusMap } from '@/hooks/queries/use-query-org-team';
import { cn } from '@/lib/utils';

import type { SelectedInterviewer } from '../../types';
import {
  CALENDAR_SLOT_MINUTES,
  CALENDAR_START_MINUTES,
  getAvailabilityRange,
  getCalendarDate,
  isCalendarSlotVisible,
} from '../calendar-range';
import {
  areInterviewersWorkingDuring,
  createAvailabilityIndex,
  getConflictingInterviewerIds,
  isInterviewerWorkingDuring,
} from './availability';
import { ResourceColumn } from './column';
import { getDraftHeightPercent, getDraftTopPercent, getZonedMinutes, isFutureSlot } from './draft-slot';
import { CalendarEventProvider, renderEvent } from './event';
import { type AvailableMember, CalendarHeader, CalendarHeaderEmpty } from './header';
import {
  BUSINESS_HOURS,
  type CalendarResourceData,
  createCalendarEvents,
  createCalendarResources,
} from './ilamy-adapter';
import { useDraftSlotDrag } from './use-draft-slot-drag';

const CALENDAR_CLASSES: NonNullable<IlamyCalendarProps['classesOverride']> = {
  disabledCell: 'bg-muted/40 text-muted-foreground pointer-events-none',
};

const StaticIlamyCalendar = memo(IlamyCalendar);
const EMPTY_RESOURCE_IDS: ReadonlySet<string> = new Set();

function showPastSlotError() {
  toast.error('Pick a future time slot');
}

function showOutsideWorkingHoursError() {
  toast.error("Pick a time within every interviewer's working hours");
}

function AvailabilityUnavailable({ className, description }: { className: string; description: string }) {
  return (
    <div className={cn('interviewer-calendar flex items-center justify-center rounded-md border bg-card', className)}>
      <EmptyState icon={CalendarDotsIcon} title="Availability unavailable" description={description} />
    </div>
  );
}

type VisibleDate = Parameters<NonNullable<IlamyCalendarProps['onDateChange']>>[0];
type CalendarStyle = CSSProperties & {
  '--calendar-draft-height': string;
  '--calendar-draft-top': string;
};

interface InterviewerCalendarProps {
  applicationId: string;
  orgId: string;
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
  className?: string;
}

function InterviewerCalendarImpl({
  applicationId,
  orgId,
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
  className = 'h-[640px]',
}: InterviewerCalendarProps) {
  const lockInterviewers = !onInterviewersChange;
  const { data: orgMembers } = useQueryOrgTeam(orgId);
  const calendarStatusMap = useQueryTeamCalendarStatusMap(orgId);
  const calendarRef = useRef<HTMLDivElement>(null);
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

  const availableMembers = useMemo<AvailableMember[]>(() => {
    const selected = new Set(interviewerUserIds);

    return (orgMembers ?? [])
      .filter((member) => member.isActive && !selected.has(member.userId))
      .map((member) => ({
        member,
        hasCalendar: calendarStatusMap.get(member.userId) ?? false,
      }));
  }, [calendarStatusMap, interviewerUserIds, orgMembers]);

  const handleAdd = useCallback(
    (userId: string) => {
      if (!onInterviewersChange) {
        return;
      }

      const entry = availableMembers.find((available) => available.member.userId === userId);

      if (!entry?.hasCalendar) {
        return;
      }

      onInterviewersChange([
        ...interviewers,
        {
          userId: entry.member.userId,
          member: entry.member,
          role: 'interviewer',
        },
      ]);
    },
    [availableMembers, interviewers, onInterviewersChange],
  );

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
  const events = useMemo(
    () => createCalendarEvents({ availability: availabilityIndex, interviewers, timeZone, visibleDay }),
    [availabilityIndex, interviewers, timeZone, visibleDay],
  );

  const calendarInitialDate = useMemo(() => getCalendarDate(visibleDay, timeZone), [timeZone, visibleDay]);

  const unavailableInterviewers =
    interviewerAvailability?.filter((interviewer) => interviewer.status === 'unavailable') ?? [];

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
      if (!isFutureSlot(info.start.toDate())) {
        showPastSlotError();

        return;
      }

      if (!isSlotWithinWorkingHours(info.start.toDate())) {
        showOutsideWorkingHoursError();

        return;
      }

      onValueChange(info.start.toISOString());
    },
    [isSlotWithinWorkingHours, onValueChange],
  );

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
        availableMembers={availableMembers}
        onAdd={handleAdd}
        timeZone={timeZone}
        onTimeZoneChange={onTimeZoneChange}
        lockInterviewers={lockInterviewers}
      />
    ),
    [availableMembers, handleAdd, lockInterviewers, onTimeZoneChange, timeZone],
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
    if (value && !draftVisible) {
      onValueChange(null);
    }
  }, [draftVisible, onValueChange, value]);

  const draftMinutes = value ? getZonedMinutes(value, timeZone) : CALENDAR_START_MINUTES;
  const calendarStyle: CalendarStyle = {
    '--calendar-draft-height': `${getDraftHeightPercent(durationMinutes)}%`,
    '--calendar-draft-top': `${getDraftTopPercent(draftMinutes)}%`,
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
  const calendarEventContext = useMemo(
    () => ({
      title: draftEventTitle,
      draftStart,
      durationMinutes,
      timeZone,
      conflictingResourceIds,
      visible: draftVisible,
      ...draftPointerHandlers,
    }),
    [
      conflictingResourceIds,
      draftEventTitle,
      draftPointerHandlers,
      draftStart,
      draftVisible,
      durationMinutes,
      timeZone,
    ],
  );

  if (interviewers.length === 0) {
    return (
      <div className={cn('interviewer-calendar flex flex-col overflow-hidden rounded-md border bg-card', className)}>
        <CalendarHeaderEmpty
          availableMembers={availableMembers}
          onAdd={handleAdd}
          timeZone={timeZone}
          onTimeZoneChange={onTimeZoneChange}
          canAddInterviewer={hasInterviewType}
          lockInterviewers={lockInterviewers}
        />
        <div className="flex flex-1 items-center justify-center">
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

  if (availabilityQuery.isLoading) {
    return <Skeleton className={cn('w-full rounded-md', className)} />;
  }

  if (availabilityQuery.isError || !interviewerAvailability) {
    return (
      <AvailabilityUnavailable
        className={className}
        description="Calendar availability could not be loaded. Try again before choosing a time."
      />
    );
  }

  if (unavailableInterviewers.length > 0) {
    const unavailableUserIds = new Set(unavailableInterviewers.map((interviewer) => interviewer.userId));
    const unavailableNames = interviewers
      .filter((interviewer) => unavailableUserIds.has(interviewer.userId))
      .map((interviewer) => getMemberDisplayName(interviewer.member))
      .join(', ');
    const unavailableDescription = unavailableNames
      ? `Calendar availability is missing for: ${unavailableNames}. Check their connection and try again.`
      : 'One or more interviewer calendars are unavailable. Check their connection and try again.';

    return <AvailabilityUnavailable className={className} description={unavailableDescription} />;
  }

  return (
    <div
      ref={calendarRef}
      className={cn('interviewer-calendar relative overflow-hidden rounded-md border bg-card', className)}
      data-draft-visible={draftVisible ? 'true' : 'false'}
      style={calendarStyle}
    >
      <CalendarEventProvider value={calendarEventContext}>
        <StaticIlamyCalendar
          orientation="vertical"
          initialView="day"
          initialDate={calendarInitialDate}
          resources={resources}
          events={events}
          businessHours={BUSINESS_HOURS}
          hideNonBusinessHours
          slotDuration={CALENDAR_SLOT_MINUTES}
          timeFormat="12-hour"
          timezone={timeZone}
          headerComponent={calendarHeader}
          renderResource={renderResource}
          renderEvent={renderEvent}
          isCellDisabled={isCellOutsideWorkingHours}
          classesOverride={CALENDAR_CLASSES}
          eventSpacing={0}
          onCellClick={handleCellClick}
          onDateChange={handleDateChange}
          disableEventClick
          disableDragAndDrop
        />
      </CalendarEventProvider>
      {availabilityQuery.isFetching && !availabilityQuery.isLoading && (
        <output
          className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
          aria-label="Refreshing interviewer availability"
        >
          <SpinnerGapIcon className="size-5 animate-spin text-muted-foreground" />
        </output>
      )}
    </div>
  );
}

export const InterviewerCalendar = memo(InterviewerCalendarImpl);
