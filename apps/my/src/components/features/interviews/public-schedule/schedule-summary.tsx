import { CompanyAvatar } from '@comitium/ui/company-avatar';
import { TimezonePicker } from '@comitium/ui/timezone-picker';
import { CalendarIcon, ClockIcon, GlobeSimpleIcon, type Icon as PhosphorIcon, UsersIcon } from '@phosphor-icons/react';
import type { AvailablePublicScheduleState, PublicScheduleSlot } from '@/lib/schemas/public-schedule';

import { formatScheduleSlotRange } from './utils';

interface ScheduleSummaryProps {
  state: AvailablePublicScheduleState;
  timeZone: string;
  isDisabled: boolean;
  onTimeZoneChange: ((timeZone: string) => void) | null;
  selectedSlot?: PublicScheduleSlot | null;
}

export function ScheduleSummary({
  state,
  timeZone,
  isDisabled,
  onTimeZoneChange,
  selectedSlot = null,
}: ScheduleSummaryProps) {
  const interviewerLabel = state.interview.interviewerCount === 1 ? 'interviewer' : 'interviewers';
  const selectedTimeLabel = selectedSlot ? formatScheduleSlotRange(selectedSlot, timeZone) : null;

  return (
    <aside className="flex min-w-0 flex-col gap-6 p-5 sm:p-6 md:row-span-2 md:min-h-[540px] md:border-r md:border-border/70 xl:row-span-1">
      <div className="flex items-start gap-3">
        <CompanyAvatar name={state.organization.name} logo={state.organization.logoUrl} className="size-11" />
        <div className="min-w-0">
          <p className="text-label-12 text-muted-foreground">Interview with</p>
          <h1 className="truncate text-heading-16">{state.organization.name}</h1>
        </div>
      </div>

      <div>
        <p className="text-label-12 text-muted-foreground">Interview</p>
        <p className="mt-1 text-label-14 font-medium text-foreground">{state.interview.title}</p>
      </div>

      <div className="space-y-3 border-t border-border/70 pt-5">
        {selectedTimeLabel && <SummaryMetric icon={CalendarIcon} label={selectedTimeLabel} />}
        <SummaryMetric icon={ClockIcon} label={`${state.interview.durationMinutes} minutes`} />
        <SummaryMetric icon={UsersIcon} label={`${state.interview.interviewerCount} ${interviewerLabel}`} />
        <div className="flex items-center gap-3 text-label-14">
          <GlobeSimpleIcon className="size-4 shrink-0 text-muted-foreground" />
          {onTimeZoneChange === null ? (
            <span>{timeZone}</span>
          ) : (
            <TimezonePicker
              value={timeZone}
              onChange={onTimeZoneChange}
              className="max-w-full"
              placeholder="Select timezone"
              disabled={isDisabled}
              variant="ghost"
            />
          )}
        </div>
      </div>
    </aside>
  );
}

function SummaryMetric({ icon: Icon, label }: { icon: PhosphorIcon; label: string }) {
  return (
    <div className="flex items-center gap-3 text-label-14">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span>{label}</span>
    </div>
  );
}
