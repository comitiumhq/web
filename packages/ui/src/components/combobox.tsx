import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { XIcon } from '@phosphor-icons/react';
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

export type ComboboxOption = SelectionOption;

export interface ComboboxProps extends SelectionFieldCommonProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  clearable?: boolean;
  closeOnSelect?: boolean;
  unknownValueLabel?: string;
}

export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  {
    options,
    value,
    onValueChange,
    placeholder,
    searchPlaceholder = 'Search…',
    emptyMessage = 'No options found.',
    disabled,
    clearLabel,
    unknownValueLabel,
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
    clearable = true,
    closeOnSelect = true,
    name,
    required,
    ...inputProps
  },
  forwardedRef,
) {
  const { open, inputRef, portalContainer, handleOpenChange } = useSelectionFieldOverlay({
    forwardedRef,
    controlledOpen,
    onOpenChange,
    portalContainerRef,
    keepOpenOnItemPress: !closeOnSelect,
  });
  const { optionMap, optionValues, optionGroups } = useSelectionFieldOptions(options);
  const selectedOption = value ? optionMap.get(value) : undefined;

  const handleValueChange = React.useCallback(
    (nextValue: string | null, eventDetails: ComboboxPrimitive.Root.ChangeEventDetails) => {
      if (nextValue === null && !clearable) {
        eventDetails.cancel();

        return;
      }

      onValueChange(nextValue);
    },
    [clearable, onValueChange],
  );

  return (
    <ComboboxPrimitive.Root
      items={optionGroups ?? optionValues}
      itemToStringLabel={(optionValue) => optionMap.get(optionValue)?.label ?? unknownValueLabel ?? optionValue}
      filter={(optionValue, query) => optionMatchesQuery(optionMap.get(optionValue), query)}
      value={value}
      onValueChange={handleValueChange}
      open={open}
      onOpenChange={handleOpenChange}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange}
      disabled={disabled}
      name={name}
      required={required}
      autoHighlight
    >
      <ComboboxPrimitive.InputGroup className={getSelectionInputGroupClassName({ variant, size, className })}>
        {((!open && selectedOption?.leading) || startContent) && (
          <span className="ml-2 shrink-0">
            {!open && selectedOption?.leading ? selectedOption.leading : startContent}
          </span>
        )}
        <ComboboxPrimitive.Input
          ref={inputRef}
          aria-label={ariaLabel}
          placeholder={open ? searchPlaceholder : placeholder}
          className={cn(getSelectionInputClassName(variant), 'flex-1')}
          {...inputProps}
        />
        {clearable && clearLabel && (
          <ComboboxPrimitive.Clear
            aria-label={clearLabel}
            title={clearLabel}
            className="mr-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          >
            <XIcon className="size-3.5" />
          </ComboboxPrimitive.Clear>
        )}
        <SelectionFieldTrigger label={ariaLabel ? `Show ${ariaLabel.toLowerCase()} options` : 'Show options'} />
      </ComboboxPrimitive.InputGroup>
      <SelectionFieldPopup
        optionMap={optionMap}
        optionGroups={optionGroups}
        emptyMessage={emptyMessage}
        portalContainer={portalContainer}
        contentClassName={contentClassName}
        listFooter={listFooter}
        footer={footer}
      />
    </ComboboxPrimitive.Root>
  );
});
