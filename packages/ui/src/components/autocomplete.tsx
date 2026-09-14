import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import * as React from 'react';
import { cn } from '../lib/cn';
import {
  getSelectionInputClassName,
  getSelectionInputGroupClassName,
  optionMatchesQuery,
  type SelectionFieldCommonProps,
  SelectionFieldPopup,
  SelectionFieldTrigger,
  type SelectionOption,
  useSelectionFieldOptions,
  useSelectionFieldOverlay,
} from './combobox-parts';
import { InputGroup, InputGroupAddon } from './input-group';

export type AutocompleteOption = SelectionOption;

export interface AutocompleteProps extends SelectionFieldCommonProps {
  value: string[];
  onValueChange: (value: string[]) => void;
}

export const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(function Autocomplete(
  {
    options,
    value,
    onValueChange,
    placeholder,
    searchPlaceholder = 'Search…',
    emptyMessage = 'No options found.',
    disabled,
    clearLabel,
    variant = 'input',
    size = 'default',
    className,
    contentClassName,
    portalContainerRef,
    ariaLabel,
    inputValue,
    onInputValueChange,
    open: controlledOpen,
    onOpenChange,
    listFooter,
    footer,
    startContent,
    name,
    required,
    ...inputProps
  },
  forwardedRef,
) {
  const { open, inputRef, portalAnchorRef, portalContainer, handleOpenChange } = useSelectionFieldOverlay({
    forwardedRef,
    controlledOpen,
    onOpenChange,
    portalContainerRef,
    keepOpenOnItemPress: false,
  });
  const { optionMap, optionValues, optionGroups } = useSelectionFieldOptions(options);
  const firstSelectedValue = value[0];
  const firstSelectedOption = firstSelectedValue ? optionMap.get(firstSelectedValue) : undefined;
  const hiddenSelectionCount = Math.max(0, value.length - 1);
  const hasSelection = value.length > 0;

  return (
    <ComboboxPrimitive.Root
      multiple
      items={optionGroups ?? optionValues}
      itemToStringLabel={(optionValue) => optionMap.get(optionValue)?.label ?? optionValue}
      filter={(optionValue, query) => optionMatchesQuery(optionMap.get(optionValue), query)}
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={handleOpenChange}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange}
      disabled={disabled}
      name={name}
      required={required}
      autoHighlight
    >
      <ComboboxPrimitive.InputGroup
        ref={portalAnchorRef}
        className={cn(getSelectionInputGroupClassName({ variant, size, className }), {
          'pointer-events-none opacity-50': disabled,
        })}
      >
        {startContent && !hasSelection && <span className="ml-2 shrink-0">{startContent}</span>}
        <ComboboxPrimitive.Chips className="flex h-full min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {!hasSelection && (
            <span
              className={cn(
                getSelectionInputClassName(variant),
                'flex min-w-0 flex-1 items-center truncate text-muted-foreground',
              )}
            >
              {placeholder}
            </span>
          )}
          {firstSelectedValue && (
            <ComboboxPrimitive.Chip className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-full bg-accent px-2 text-sm text-accent-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {firstSelectedOption?.leading && <span className="shrink-0">{firstSelectedOption.leading}</span>}
              <span className="min-w-0 flex-1 truncate">{firstSelectedOption?.label ?? firstSelectedValue}</span>
              <ComboboxPrimitive.ChipRemove
                aria-label={`Remove ${firstSelectedOption?.label ?? firstSelectedValue}`}
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
              >
                <XIcon className="size-3" />
              </ComboboxPrimitive.ChipRemove>
            </ComboboxPrimitive.Chip>
          )}
          {hiddenSelectionCount > 0 && (
            <span className="flex h-7 shrink-0 items-center rounded-full bg-accent px-2 text-sm text-muted-foreground">
              <span aria-hidden>+{hiddenSelectionCount}</span>
              <span className="sr-only">{hiddenSelectionCount} more selected</span>
            </span>
          )}
        </ComboboxPrimitive.Chips>
        {clearLabel && hasSelection && (
          <ComboboxPrimitive.Clear
            aria-label={clearLabel}
            title={clearLabel}
            className="mr-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          >
            <XIcon className="size-3.5" />
          </ComboboxPrimitive.Clear>
        )}
        <SelectionFieldTrigger label={ariaLabel ?? 'Select options'} />
      </ComboboxPrimitive.InputGroup>
      <SelectionFieldPopup
        optionMap={optionMap}
        optionGroups={optionGroups}
        emptyMessage={emptyMessage}
        portalContainer={portalContainer}
        contentClassName={contentClassName}
        searchInput={
          <div className="p-1 pb-0">
            <InputGroup className="h-9 rounded-xl">
              <ComboboxPrimitive.Input
                ref={inputRef}
                aria-label={ariaLabel ? `Search ${ariaLabel.toLowerCase()}` : 'Search options'}
                placeholder={searchPlaceholder}
                data-slot="input-group-control"
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
                {...inputProps}
              />
              <InputGroupAddon>
                <MagnifyingGlassIcon className="size-4 shrink-0 opacity-50" />
              </InputGroupAddon>
            </InputGroup>
          </div>
        }
        listFooter={listFooter}
        footer={footer}
      />
    </ComboboxPrimitive.Root>
  );
});
