import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@comitium/ui/input-group';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import { type ChangeEvent, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PipelineSearchInputProps {
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function PipelineSearchInput({ value, placeholder, onValueChange, className }: PipelineSearchInputProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onValueChange(event.target.value);
    },
    [onValueChange],
  );
  const handleClear = useCallback(() => {
    onValueChange('');
  }, [onValueChange]);

  return (
    <InputGroup className={cn('h-11', className)}>
      <InputGroupAddon>
        <MagnifyingGlassIcon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        role="searchbox"
        inputMode="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="button" size="icon-xs" aria-label="Clear search" onClick={handleClear}>
            <XIcon aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
