'use client';

import { CaretDownIcon } from '@phosphor-icons/react';
import { memo, type ReactNode, type RefObject, useCallback, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface SearchSelectOption {
  value: string;
  label: string;
  searchValue?: string;
  description?: string;
  trailing?: ReactNode;
  disabled?: boolean;
}

const OVERLAY_CONTENT_SELECTOR = '[data-slot="sheet-content"], [data-slot="dialog-content"]';

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  clearLabel?: string;
  unknownValueLabel?: string;
  variant?: 'input' | 'ghost';
  className?: string;
  contentClassName?: string;
  portalContainerRef?: RefObject<HTMLElement | null>;
  ariaLabel?: string;
}

export function SearchSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
  clearLabel,
  unknownValueLabel,
  variant = 'input',
  className,
  contentClassName,
  portalContainerRef,
  ariaLabel,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [localPortalContainer, setLocalPortalContainer] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  const displayLabel = getDisplayLabel({ selectedOption, value, unknownValueLabel, placeholder });
  const isPlaceholder = !selectedOption && !value;
  const portalContainer = portalContainerRef?.current ?? localPortalContainer;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && !portalContainerRef?.current) {
        setLocalPortalContainer(triggerRef.current?.closest<HTMLElement>(OVERLAY_CONTENT_SELECTOR) ?? null);
      }

      setOpen(nextOpen);
    },
    [portalContainerRef],
  );
  const handleSelect = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue);
      setOpen(false);
    },
    [onValueChange],
  );

  const handleClear = useCallback(() => {
    onValueChange(null);
    setOpen(false);
  }, [onValueChange]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* biome-ignore lint/a11y/useSemanticElements: A searchable combobox cannot be represented by a native select. */}
        <Button
          ref={triggerRef}
          type="button"
          variant={variant === 'ghost' ? 'ghost' : 'outline'}
          size={variant === 'ghost' ? 'sm' : 'default'}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'max-w-full justify-between font-normal',
            variant === 'input' && 'w-full',
            variant === 'ghost' && 'justify-start gap-1.5 px-0',
            isPlaceholder && 'text-muted-foreground',
            className,
          )}
        >
          <span className="min-w-0 truncate">{displayLabel}</span>
          <CaretDownIcon className="ml-auto shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        container={portalContainer}
        className={cn('w-(--radix-popover-trigger-width) min-w-64 gap-0 p-0', contentClassName)}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {clearLabel && <SearchSelectClearItem label={clearLabel} onSelect={handleClear} />}
              {options.map((option) => (
                <SearchSelectItem
                  key={option.value}
                  option={option}
                  selected={option.value === value}
                  onSelect={handleSelect}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function getDisplayLabel(params: {
  selectedOption: SearchSelectOption | null;
  value: string | null;
  unknownValueLabel: string | undefined;
  placeholder: string;
}) {
  if (params.selectedOption) return params.selectedOption.label;
  if (!params.value) return params.placeholder;

  return params.unknownValueLabel ?? params.value;
}

interface SearchSelectItemProps {
  option: SearchSelectOption;
  selected: boolean;
  onSelect: (value: string) => void;
}

const SearchSelectItem = memo(function SearchSelectItem({ option, selected, onSelect }: SearchSelectItemProps) {
  const handleSelect = useCallback(() => onSelect(option.value), [onSelect, option.value]);

  return (
    <CommandItem
      value={option.searchValue ?? option.label}
      disabled={option.disabled}
      data-checked={selected}
      onSelect={handleSelect}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{option.label}</span>
        {option.description && (
          <span className="truncate text-copy-12 text-muted-foreground">{option.description}</span>
        )}
      </span>
      {option.trailing && <span className="shrink-0 text-copy-12 text-muted-foreground">{option.trailing}</span>}
    </CommandItem>
  );
});

const SearchSelectClearItem = memo(function SearchSelectClearItem({
  label,
  onSelect,
}: {
  label: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={label} onSelect={onSelect}>
      <span className="text-muted-foreground">{label}</span>
    </CommandItem>
  );
});
