import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import { Button } from '@comitium/ui/button';
import { BROWSER_TZ, formatInTimezone } from '@comitium/ui/date';
import { Label } from '@comitium/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { CalendarDotsIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ReasonPicker } from '@/components/features/cancel-reschedule-reasons/reason-picker';
import { useReasonPickerState } from '@/components/features/cancel-reschedule-reasons/use-reason-picker-state';
import { useRescheduleInterview } from '@/hooks/mutations/use-interview-mutations';
import { useQueryOrgTeamMap } from '@/hooks/queries/use-query-org-team';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import { hasApiErrorCode } from '@/lib/api/client';
import type { InterviewEvent, RescheduleInterviewBody } from '@/lib/schemas/interviews';
import { AvailabilityConflictDialog, getAvailabilityConflictDescription } from './availability-conflict-dialog';
import { getInitialCalendarDay } from './schedule-dialog/calendar-range';
import type { SelectedInterviewer } from './types';

const InterviewerCalendar = lazy(() =>
  import('./schedule-dialog/interviewer-calendar').then((m) => ({ default: m.InterviewerCalendar })),
);

interface RescheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  orgId: string;
  scheduleId: string;
  interview: InterviewEvent;
}

export function RescheduleInterviewDialog({
  open,
  onOpenChange,
  applicationId,
  orgId,
  scheduleId,
  interview,
}: RescheduleInterviewDialogProps) {
  const { mutate: reschedule, isPending } = useRescheduleInterview();
  const { data: meData } = useQueryOrgMe(orgId);
  const memberMap = useQueryOrgTeamMap(orgId);
  const initialTimeZone = meData?.timezone ?? BROWSER_TZ;
  const picker = useReasonPickerState(orgId, 'reschedule', open);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [conflictingBody, setConflictingBody] = useState<RescheduleInterviewBody | null>(null);
  const [conflictDescription, setConflictDescription] = useState('');

  const initialDay = useMemo(
    () => getInitialCalendarDay(interview.scheduledAt, initialTimeZone),
    [initialTimeZone, interview.scheduledAt],
  );
  const [visibleDay, setVisibleDay] = useState(initialDay);

  useEffect(() => {
    if (open) {
      setSelectedTime(null);
      setTimeZone(initialTimeZone);
      setVisibleDay(initialDay);
      setConflictingBody(null);
      setConflictDescription('');
    }
  }, [initialDay, initialTimeZone, open]);

  const interviewers = useMemo<SelectedInterviewer[]>(
    () =>
      interview.interviewers.map((iv) => {
        const member = memberMap.get(iv.userId);
        const fallback = {
          userId: iv.userId,
          email: null,
          name: 'Former member',
        };

        return {
          userId: iv.userId,
          member: member ?? fallback,
          role: iv.role as SelectedInterviewer['role'],
        };
      }),
    [interview.interviewers, memberMap],
  );

  const currentLabel = useMemo(() => {
    if (!interview.scheduledAt) {
      return null;
    }

    return formatInTimezone(interview.scheduledAt, timeZone, 'EEE, MMM d · h:mm a (zzz)');
  }, [interview.scheduledAt, timeZone]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleSubmit = useCallback(() => {
    picker.setSubmitted(true);

    if (!selectedTime) {
      return;
    }

    if (picker.reasonRequired && !picker.reasonId) {
      return;
    }

    const body = picker.buildBody();

    const requestBody: RescheduleInterviewBody = {
      scheduledAt: selectedTime,
      timeZone,
      ...body,
    };
    reschedule(
      {
        applicationId,
        interviewId: scheduleId,
        body: requestBody,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          if (hasApiErrorCode(error, API_ERROR_CODES.availabilityConflict)) {
            setConflictingBody(requestBody);
            setConflictDescription(getAvailabilityConflictDescription(error, interviewers));
          }
        },
      },
    );
  }, [selectedTime, picker, reschedule, applicationId, scheduleId, onOpenChange, timeZone]);

  const handleConflictOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setConflictingBody(null);
      setConflictDescription('');
    }
  }, []);

  const handleOverride = useCallback(() => {
    if (!conflictingBody) {
      return;
    }

    reschedule(
      {
        applicationId,
        interviewId: scheduleId,
        body: { ...conflictingBody, availabilityOverride: true },
      },
      {
        onSuccess: () => {
          setConflictingBody(null);
          setConflictDescription('');
          onOpenChange(false);
        },
      },
    );
  }, [applicationId, conflictingBody, onOpenChange, reschedule, scheduleId]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex flex-col p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-6xl"
        >
          <SheetHeader className="border-b shrink-0">
            <SheetTitle>Reschedule Interview</SheetTitle>
            <SheetDescription>Pick a new time slot. Interviewers and meeting details stay the same.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="flex flex-col gap-1 rounded-md border bg-muted p-3">
              <div className="flex items-center gap-2 text-label-14">
                <CalendarDotsIcon className="size-4 text-muted-foreground" />
                <span className="font-medium">{interview.title}</span>
                <span className="text-muted-foreground">· {interview.durationMinutes} min</span>
              </div>
              {currentLabel && (
                <p className="text-copy-14 text-muted-foreground">
                  Currently scheduled: <span className="font-medium text-foreground">{currentLabel}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>New date & time</Label>
              <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-md" />}>
                <InterviewerCalendar
                  applicationId={applicationId}
                  orgId={orgId}
                  interviewers={interviewers}
                  timeZone={timeZone}
                  onTimeZoneChange={setTimeZone}
                  value={selectedTime}
                  onValueChange={setSelectedTime}
                  durationMinutes={interview.durationMinutes}
                  draftEventTitle={interview.title}
                  hasInterviewType
                  visibleDay={visibleDay}
                  onVisibleDayChange={setVisibleDay}
                  className="h-[480px]"
                />
              </Suspense>
            </div>

            <ReasonPicker state={picker} disabled={isPending} idPrefix="reschedule" />
          </div>

          <SheetFooter className="border-t shrink-0 flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending || !selectedTime}>
              {isPending && <SpinnerGapIcon data-icon="inline-start" className="animate-spin" />}
              Reschedule
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AvailabilityConflictDialog
        open={conflictingBody !== null}
        onOpenChange={handleConflictOpenChange}
        onConfirm={handleOverride}
        actionLabel="Reschedule anyway"
        description={conflictDescription}
      />
    </>
  );
}
