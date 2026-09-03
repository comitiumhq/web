import { Button } from '@comitium/ui/button';
import { cn } from '@comitium/ui/cn';
import { formatInTimezone } from '@comitium/ui/date';
import { CalendarXIcon } from '@phosphor-icons/react';
import { memo, useCallback, useMemo } from 'react';
import type { PublicScheduleSlot } from '@/lib/schemas/public-schedule';

import { ScheduleSlotsSkeleton } from './schedule-skeletons';
import type { SlotGroupData } from './types';

const SLOT_BUTTON_CLASS_NAME = 'h-10 w-full';
const IDLE_SLOT_BUTTON_CLASS_NAME = 'bg-card hover:bg-muted/50';
const SELECTED_SLOT_BUTTON_CLASS_NAME = 'ring-2 ring-foreground/25';

interface SlotPickerProps {
  group: SlotGroupData | null;
  timeZone: string;
  selectedSlotStart: string | null;
  isLoading: boolean;
  onSelectSlot: (slot: PublicScheduleSlot) => void;
}

export function SlotPicker({ group, timeZone, selectedSlotStart, isLoading, onSelectSlot }: SlotPickerProps) {
  if (isLoading) {
    return <ScheduleSlotsSkeleton />;
  }

  if (!group) {
    return (
      <SlotPickerMessage
        icon={CalendarXIcon}
        title="No times available"
        description="There are no open times in this booking window."
      />
    );
  }

  return (
    <SlotGroup group={group} timeZone={timeZone} selectedSlotStart={selectedSlotStart} onSelectSlot={onSelectSlot} />
  );
}

function SlotPickerMessage({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarXIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/10">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-heading-14">{title}</p>
        <p className="mt-1 text-copy-13 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

interface SlotGroupProps {
  group: SlotGroupData;
  timeZone: string;
  selectedSlotStart: string | null;
  onSelectSlot: (slot: PublicScheduleSlot) => void;
}

const SlotGroup = memo(function SlotGroup({ group, timeZone, selectedSlotStart, onSelectSlot }: SlotGroupProps) {
  const slotNodes = useMemo(
    () =>
      group.slots.map((slot) => (
        <SlotButton
          key={slot.start}
          slot={slot}
          timeZone={timeZone}
          isSelected={slot.start === selectedSlotStart}
          onSelect={onSelectSlot}
        />
      )),
    [group.slots, onSelectSlot, selectedSlotStart, timeZone],
  );

  return (
    <section>
      <h3 className="mb-2 text-heading-14">{group.label}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">{slotNodes}</div>
    </section>
  );
});

interface SlotButtonProps {
  slot: PublicScheduleSlot;
  timeZone: string;
  isSelected: boolean;
  onSelect: (slot: PublicScheduleSlot) => void;
}

const SlotButton = memo(function SlotButton({ slot, timeZone, isSelected, onSelect }: SlotButtonProps) {
  const label = formatInTimezone(slot.start, timeZone, 'h:mm a');
  const handleSelect = useCallback(() => {
    onSelect(slot);
  }, [onSelect, slot]);

  return (
    <Button
      type="button"
      variant={isSelected ? 'secondary' : 'outline'}
      className={cn(SLOT_BUTTON_CLASS_NAME, {
        [IDLE_SLOT_BUTTON_CLASS_NAME]: !isSelected,
        [SELECTED_SLOT_BUTTON_CLASS_NAME]: isSelected,
      })}
      onClick={handleSelect}
    >
      {label}
    </Button>
  );
});
