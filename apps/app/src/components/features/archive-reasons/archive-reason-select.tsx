import { SearchSelect, type SearchSelectOption } from '@comitium/ui/search-select';
import type { RefObject } from 'react';

interface ArchiveReasonSelectProps {
  options: SearchSelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder: string;
  disabled?: boolean;
  portalContainerRef?: RefObject<HTMLElement | null>;
}

export function ArchiveReasonSelect({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  portalContainerRef,
}: ArchiveReasonSelectProps) {
  return (
    <SearchSelect
      ariaLabel="Archive reason"
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Search reasons..."
      emptyMessage="No matching reasons found."
      disabled={disabled}
      portalContainerRef={portalContainerRef}
    />
  );
}
