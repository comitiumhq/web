import { Button } from '@comitium/ui/button';
import { Calendar } from '@comitium/ui/calendar';
import { cn } from '@comitium/ui/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { CalendarIcon } from '@phosphor-icons/react';
import { format, parseISO } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

interface DateWidgetProps {
  field: ControllerRenderProps;
}

export function DateWidget({ field }: DateWidgetProps) {
  const [open, setOpen] = useState(false);

  const parsed = useMemo(() => {
    if (!isNonEmptyString(field.value)) {
      return null;
    }

    try {
      const date = parseISO(field.value);

      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }, [field.value]);

  const display = parsed ? format(parsed, 'MMM d, yyyy') : 'Select date';
  const value = typeof field.value === 'string' ? field.value : '';

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (!nextOpen) {
        field.onBlur();
      }
    },
    [field],
  );

  const handleSelect = useCallback(
    (next?: Date) => {
      field.onChange(next ? format(next, 'yyyy-MM-dd') : '');
      setOpen(false);
      field.onBlur();
    },
    [field],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn('w-full justify-between font-normal', !parsed && 'text-muted-foreground')}
          ref={field.ref}
          data-form-focus-target=""
        >
          <span>{display}</span>
          <CalendarIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={parsed ?? undefined} onSelect={handleSelect} />
      </PopoverContent>
      <input type="hidden" name={field.name} value={value} readOnly />
    </Popover>
  );
}
