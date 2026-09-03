import { BROWSER_TZ } from '@comitium/ui/date';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBookPublicScheduleSlot } from '@/hooks/mutations/use-public-schedule-mutations';
import { useQueryPublicScheduleSlots } from '@/hooks/queries/use-query-public-schedule';
import type {
  AvailablePublicScheduleState,
  BookPublicScheduleResponse,
  PublicScheduleSlot,
} from '@/lib/schemas/public-schedule';

import { PublicScheduleBookingStep } from './booking-step';
import { PublicScheduleConfirmation } from './confirmation-state';
import { PublicScheduleSlotSelectionStep } from './slot-selection-step';
import { buildSlotWindow, EMPTY_PUBLIC_SCHEDULE_SLOTS, getPublicScheduleErrorMessage, groupSlotsByDay } from './utils';

interface AvailablePublicScheduleProps {
  token: string;
  state: AvailablePublicScheduleState;
  onStateRefresh: () => Promise<unknown>;
}

export function AvailablePublicSchedule({ token, state, onStateRefresh }: AvailablePublicScheduleProps) {
  const [timeZone, setTimeZone] = useState(BROWSER_TZ);
  const effectiveTimeZone = timeZone || BROWSER_TZ;
  const [selectedSlot, setSelectedSlot] = useState<PublicScheduleSlot | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookPublicScheduleResponse['data'] | null>(null);
  const slotWindow = useMemo(() => buildSlotWindow(state.defaults), [state.defaults]);
  const slotsQuery = useQueryPublicScheduleSlots({
    token,
    from: slotWindow.from,
    to: slotWindow.to,
    timeZone: effectiveTimeZone,
    enabled: confirmation === null,
  });

  const slots = slotsQuery.data?.data.slots ?? EMPTY_PUBLIC_SCHEDULE_SLOTS;
  const slotGroups = useMemo(() => groupSlotsByDay(slots, effectiveTimeZone), [effectiveTimeZone, slots]);

  const selectedDayGroup = useMemo(() => {
    const matchingGroup = slotGroups.find((group) => group.key === selectedDayKey);

    if (matchingGroup) {
      return matchingGroup;
    }

    if (slotGroups.length === 0) {
      return null;
    }

    return slotGroups[0];
  }, [selectedDayKey, slotGroups]);

  const isSlotsLoading = slotsQuery.isLoading || slotsQuery.isFetching;
  const slotsError = Boolean(slotsQuery.error);
  const refetchSlots = slotsQuery.refetch;
  const { mutate: bookSlot, isPending } = useBookPublicScheduleSlot();

  useEffect(() => {
    if (isSlotsLoading) {
      return;
    }

    if (slotGroups.length === 0) {
      setSelectedDayKey(null);

      return;
    }

    if (slotGroups.some((group) => group.key === selectedDayKey)) {
      return;
    }

    setSelectedDayKey(slotGroups[0].key);
  }, [isSlotsLoading, selectedDayKey, slotGroups]);

  useEffect(() => {
    if (!selectedSlot) {
      return;
    }

    if (slots.some((slot) => slot.start === selectedSlot.start)) {
      return;
    }

    setSelectedSlot(null);
  }, [selectedSlot, slots]);

  const handleTimezoneChange = useCallback((nextTimeZone: string) => {
    if (!nextTimeZone) {
      return;
    }

    setTimeZone(nextTimeZone);
    setSelectedDayKey(null);
    setSelectedSlot(null);
    setSubmitError(null);
  }, []);

  const handleSelectDay = useCallback((dayKey: string) => {
    setSelectedDayKey(dayKey);
    setSelectedSlot(null);
    setSubmitError(null);
  }, []);

  const handleSelectSlot = useCallback((slot: PublicScheduleSlot) => {
    setSelectedSlot(slot);
    setSubmitError(null);
  }, []);

  const handleBackToSlots = useCallback(() => {
    setSelectedSlot(null);
    setSubmitError(null);
  }, []);

  const handleBookSlot = useCallback(() => {
    if (!selectedSlot) {
      setSubmitError('Choose a time before booking.');

      return;
    }

    setSubmitError(null);
    bookSlot(
      {
        token,
        body: {
          start: selectedSlot.start,
          timeZone: effectiveTimeZone,
        },
      },
      {
        onSuccess: (result) => {
          setConfirmation(result.data);
        },
        onError: (error) => {
          setSubmitError(getPublicScheduleErrorMessage(error, 'This time is no longer available. Pick another slot.'));
          setSelectedSlot(null);
          refetchSlots();
          onStateRefresh();
        },
      },
    );
  }, [bookSlot, effectiveTimeZone, onStateRefresh, refetchSlots, selectedSlot, token]);

  if (confirmation) {
    return <PublicScheduleConfirmation confirmation={confirmation} state={state} timeZone={effectiveTimeZone} />;
  }

  if (selectedSlot) {
    return (
      <PublicScheduleBookingStep
        state={state}
        timeZone={effectiveTimeZone}
        selectedSlot={selectedSlot}
        isPending={isPending}
        submitError={submitError}
        onBack={handleBackToSlots}
        onSubmit={handleBookSlot}
      />
    );
  }

  return (
    <PublicScheduleSlotSelectionStep
      state={state}
      timeZone={effectiveTimeZone}
      isPending={isPending}
      slotGroups={slotGroups}
      selectedDayKey={selectedDayKey}
      selectedDayGroup={selectedDayGroup}
      isSlotsLoading={isSlotsLoading}
      slotsError={slotsError}
      submitError={submitError}
      onTimeZoneChange={handleTimezoneChange}
      onSelectDay={handleSelectDay}
      onSelectSlot={handleSelectSlot}
    />
  );
}
