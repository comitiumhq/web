import { Skeleton } from '@comitium/ui/skeleton';
import { lazy, Suspense, useCallback, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';

import type { SelectedInterviewer } from '../types';
import { getInitialCalendarDay } from './calendar-range';
import type { FormData } from './schema';

const InterviewerCalendar = lazy(() =>
  import('./interviewer-calendar').then((m) => ({ default: m.InterviewerCalendar })),
);

interface SlotPickerFieldProps {
  control: Control<FormData>;
  applicationId: string;
  orgId: string;
  interviewers: SelectedInterviewer[];
  onInterviewersChange: (next: SelectedInterviewer[]) => void;
  value: string | null;
  onChange: (time: string) => void;
  onTimeZoneChange: (tz: string) => void;
  draftEventTitle: string;
  hasInterviewType: boolean;
}

export function SlotPickerField({
  control,
  applicationId,
  orgId,
  interviewers,
  onInterviewersChange,
  value,
  onChange,
  onTimeZoneChange,
  draftEventTitle,
  hasInterviewType,
}: SlotPickerFieldProps) {
  const durationMinutes = useWatch({ control, name: 'durationMinutes' });
  const timeZone = useWatch({ control, name: 'timeZone' });

  const [visibleDay, setVisibleDay] = useState(() => getInitialCalendarDay(value, timeZone));
  const handleValueChange = useCallback((nextValue: string | null) => onChange(nextValue ?? ''), [onChange]);

  return (
    <Suspense fallback={<Skeleton className="h-full min-h-[28rem] w-full rounded-md" />}>
      <InterviewerCalendar
        applicationId={applicationId}
        orgId={orgId}
        interviewers={interviewers}
        onInterviewersChange={onInterviewersChange}
        timeZone={timeZone}
        onTimeZoneChange={onTimeZoneChange}
        value={value}
        onValueChange={handleValueChange}
        durationMinutes={durationMinutes}
        draftEventTitle={draftEventTitle}
        hasInterviewType={hasInterviewType}
        visibleDay={visibleDay}
        onVisibleDayChange={setVisibleDay}
        className="h-full min-h-[28rem]"
      />
    </Suspense>
  );
}
