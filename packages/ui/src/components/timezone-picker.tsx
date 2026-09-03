import { memo, useCallback } from 'react';

import { ALL_TIMEZONES, BROWSER_TZ } from '../lib/timezones';
import { SearchSelect, type SearchSelectOption } from './search-select';

const TIMEZONE_OPTIONS: SearchSelectOption[] = ALL_TIMEZONES.map((tz) => ({
  value: tz,
  label: tz,
  trailing: tz === BROWSER_TZ ? 'your timezone' : undefined,
}));

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  variant?: 'input' | 'ghost';
}

function TimezonePickerImpl({
  value,
  onChange,
  disabled,
  className,
  placeholder = 'Select timezone',
  variant = 'input',
}: TimezonePickerProps) {
  const handleValueChange = useCallback(
    (next: string | null) => {
      if (!next) {
        return;
      }

      onChange(next);
    },
    [onChange],
  );

  return (
    <SearchSelect
      options={TIMEZONE_OPTIONS}
      value={value || BROWSER_TZ}
      onValueChange={handleValueChange}
      placeholder={placeholder}
      searchPlaceholder="Search timezones..."
      emptyMessage="No timezone found."
      disabled={disabled}
      variant={variant}
      className={className}
      contentClassName={variant === 'ghost' ? 'w-80 min-w-80' : undefined}
    />
  );
}

export const TimezonePicker = memo(TimezonePickerImpl);
