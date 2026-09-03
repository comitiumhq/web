import { Alert, AlertDescription } from '@comitium/ui/alert';
import { Card } from '@comitium/ui/card';
import { CalendarXIcon, type Icon as PhosphorIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { AvailablePublicScheduleState, PublicScheduleSlot } from '@/lib/schemas/public-schedule';

import { MemoizedScheduleDatePicker } from './date-picker';
import { PublicScheduleFrame } from './public-schedule-frame';
import { ScheduleSummary } from './schedule-summary';
import { SlotPicker } from './slot-picker';
import type { SlotGroupData } from './types';

interface PublicScheduleSlotSelectionStepProps {
  state: AvailablePublicScheduleState;
  timeZone: string;
  isPending: boolean;
  slotGroups: SlotGroupData[];
  selectedDayKey: string | null;
  selectedDayGroup: SlotGroupData | null;
  isSlotsLoading: boolean;
  slotsError: boolean;
  submitError: string | null;
  onTimeZoneChange: (timeZone: string) => void;
  onSelectDay: (dayKey: string) => void;
  onSelectSlot: (slot: PublicScheduleSlot) => void;
}

export function PublicScheduleSlotSelectionStep({
  state,
  timeZone,
  isPending,
  slotGroups,
  selectedDayKey,
  selectedDayGroup,
  isSlotsLoading,
  slotsError,
  submitError,
  onTimeZoneChange,
  onSelectDay,
  onSelectSlot,
}: PublicScheduleSlotSelectionStepProps) {
  const hasNoSlots = !isSlotsLoading && !slotsError && slotGroups.length === 0;
  const availabilityPanel = getAvailabilityPanel(slotsError, hasNoSlots);

  return (
    <PublicScheduleFrame size="wide">
      <Card className="w-full gap-0 py-0">
        <div className="grid min-w-0 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,260px)]">
          <ScheduleSummary
            state={state}
            timeZone={timeZone}
            isDisabled={isPending}
            onTimeZoneChange={onTimeZoneChange}
            selectedSlot={null}
          />

          {availabilityPanel ? (
            <section className="min-w-0 border-t border-border/70 p-5 sm:p-6 md:col-start-2 md:border-t-0 lg:p-6 xl:col-span-2">
              <AvailabilityStatePanel {...availabilityPanel} />
            </section>
          ) : (
            <ScheduleSlotSelectionPanels
              slotGroups={slotGroups}
              selectedDayKey={selectedDayGroup?.key ?? selectedDayKey}
              selectedDayGroup={selectedDayGroup}
              timeZone={timeZone}
              isSlotsLoading={isSlotsLoading}
              submitError={submitError}
              onSelectDay={onSelectDay}
              onSelectSlot={onSelectSlot}
            />
          )}
        </div>
      </Card>
    </PublicScheduleFrame>
  );
}

function ScheduleSlotSelectionPanels({
  slotGroups,
  selectedDayKey,
  selectedDayGroup,
  timeZone,
  isSlotsLoading,
  submitError,
  onSelectDay,
  onSelectSlot,
}: {
  slotGroups: SlotGroupData[];
  selectedDayKey: string | null;
  selectedDayGroup: SlotGroupData | null;
  timeZone: string;
  isSlotsLoading: boolean;
  submitError: string | null;
  onSelectDay: (dayKey: string) => void;
  onSelectSlot: (slot: PublicScheduleSlot) => void;
}) {
  return (
    <>
      <section className="min-w-0 border-t border-border/70 p-5 sm:p-6 md:border-t-0 lg:p-6">
        <MemoizedScheduleDatePicker
          groups={slotGroups}
          selectedDayKey={selectedDayKey}
          isLoading={isSlotsLoading}
          onSelectDay={onSelectDay}
        />
      </section>

      <section className="min-w-0 border-t border-border/70 p-5 sm:p-6 md:col-start-2 xl:col-start-auto xl:border-t-0 xl:border-l">
        <div className="space-y-5">
          <SlotPicker
            group={selectedDayGroup}
            timeZone={timeZone}
            selectedSlotStart={null}
            isLoading={isSlotsLoading}
            onSelectSlot={onSelectSlot}
          />

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </div>
      </section>
    </>
  );
}

function AvailabilityStatePanel({
  icon: Icon,
  title,
  description,
}: {
  icon: PhosphorIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center p-6 text-center md:min-h-[492px]">
      <div>
        <Icon className="mx-auto size-5 text-muted-foreground" />
        <h2 className="mt-3 text-heading-16">{title}</h2>
        <p className="mt-1 text-copy-14 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function getAvailabilityPanel(slotsError: boolean, hasNoSlots: boolean) {
  if (slotsError) {
    return {
      icon: WarningCircleIcon,
      title: 'Availability could not be loaded',
      description: 'Please try again in a moment.',
    };
  }

  if (hasNoSlots) {
    return {
      icon: CalendarXIcon,
      title: 'No times available',
      description: 'There are no open times in this booking window.',
    };
  }

  return null;
}
