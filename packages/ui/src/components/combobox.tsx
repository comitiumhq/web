'use client';

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { CaretDownIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
import * as React from 'react';
import { cn } from '../lib/cn';

const OVERLAY_CONTENT_SELECTOR =
  '[data-slot="sheet-content"], [data-slot="dialog-content"], [data-slot="popover-content"]';

export interface ComboboxOption {
  value: string;
  label: string;
  searchValue?: string;
  description?: string;
  group?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

interface ComboboxCommonProps
  extends Omit<
    React.ComponentProps<'input'>,
    'children' | 'className' | 'defaultValue' | 'disabled' | 'onChange' | 'placeholder' | 'ref' | 'size' | 'value'
  > {
  options: readonly ComboboxOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: React.ReactNode;
  disabled?: boolean;
  clearLabel?: string;
  unknownValueLabel?: string;
  variant?: 'input' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  contentClassName?: string;
  portalContainerRef?: React.RefObject<HTMLElement | null>;
  ariaLabel?: string;
  maxVisibleValues?: number;
  selectedOverflowLabel?: (hiddenCount: number) => string;
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  listFooter?: React.ReactNode;
  footer?: React.ReactNode;
  startContent?: React.ReactNode;
}

interface SingleComboboxProps extends ComboboxCommonProps {
  selectionMode: 'single';
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** Whether clearing the search input can clear the selected value. */
  clearable?: boolean;
  closeOnSelect?: boolean;
}

interface MultipleComboboxProps extends ComboboxCommonProps {
  selectionMode: 'multiple';
  value: string[];
  onValueChange: (value: string[]) => void;
}

export type ComboboxProps = SingleComboboxProps | MultipleComboboxProps;

export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(props, forwardedRef) {
  if (props.selectionMode === 'multiple') {
    return <MultipleCombobox {...props} forwardedRef={forwardedRef} />;
  }

  return <SingleCombobox {...props} forwardedRef={forwardedRef} />;
});

interface InternalRefProps {
  forwardedRef: React.ForwardedRef<HTMLInputElement>;
}

function SingleCombobox({
  selectionMode: _selectionMode,
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
  forwardedRef,
  name,
  required,
  ...inputProps
}: SingleComboboxProps & InternalRefProps) {
  const [open, setOpen] = useComboboxOpen(controlledOpen, onOpenChange);
  const { inputRef, portalContainer, handleOpenChange } = useComboboxOverlay({
    forwardedRef,
    open,
    portalContainerRef,
    setOpen,
    keepOpenOnItemPress: !closeOnSelect,
  });

  const { optionMap, optionValues, optionGroups } = useComboboxOptions(options);
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
      <ComboboxPrimitive.InputGroup className={getInputGroupClassName({ variant, size, multiple: false, className })}>
        {((!open && selectedOption?.leading) || startContent) && (
          <span className="ml-2 shrink-0">
            {!open && selectedOption?.leading ? selectedOption.leading : startContent}
          </span>
        )}
        <ComboboxPrimitive.Input
          ref={inputRef}
          aria-label={ariaLabel}
          placeholder={open ? searchPlaceholder : placeholder}
          className={getInputClassName(variant)}
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
        <ComboboxTrigger ariaLabel={ariaLabel} />
      </ComboboxPrimitive.InputGroup>
      <ComboboxPopup
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
}

function MultipleCombobox({
  selectionMode: _selectionMode,
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
  maxVisibleValues = 3,
  selectedOverflowLabel = defaultSelectedOverflowLabel,
  inputValue,
  onInputValueChange,
  open: controlledOpen,
  onOpenChange,
  listFooter,
  footer,
  startContent,
  forwardedRef,
  name,
  required,
  ...inputProps
}: MultipleComboboxProps & InternalRefProps) {
  const [open, setOpen] = useComboboxOpen(controlledOpen, onOpenChange);
  const { inputRef, portalContainer, handleOpenChange } = useComboboxOverlay({
    forwardedRef,
    open,
    portalContainerRef,
    setOpen,
    keepOpenOnItemPress: true,
  });

  const { optionMap, optionValues, optionGroups } = useComboboxOptions(options);
  const visibleValues = value.slice(0, maxVisibleValues);
  const hiddenCount = Math.max(0, value.length - visibleValues.length);

  let inputPlaceholder = '';

  if (value.length === 0) {
    inputPlaceholder = placeholder;
  } else if (open) {
    inputPlaceholder = searchPlaceholder;
  }

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
      <ComboboxPrimitive.InputGroup className={getInputGroupClassName({ variant, size, multiple: true, className })}>
        {startContent && value.length === 0 && <span className="ml-2 shrink-0">{startContent}</span>}
        <ComboboxPrimitive.Chips className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {visibleValues.map((selectedValue) => {
            const option = optionMap.get(selectedValue);
            return (
              <ComboboxPrimitive.Chip
                key={selectedValue}
                className="flex h-7 max-w-full items-center gap-1 rounded-full bg-accent px-2 text-sm text-accent-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {option?.leading && <span className="shrink-0">{option.leading}</span>}
                <span className="min-w-0 truncate">{option?.label ?? selectedValue}</span>
                <ComboboxPrimitive.ChipRemove
                  aria-label={`Remove ${option?.label ?? selectedValue}`}
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <XIcon className="size-3" />
                </ComboboxPrimitive.ChipRemove>
              </ComboboxPrimitive.Chip>
            );
          })}
          {hiddenCount > 0 && (
            <span className="flex h-7 shrink-0 items-center rounded-full bg-accent px-2 text-sm text-muted-foreground">
              {selectedOverflowLabel(hiddenCount)}
            </span>
          )}
          <ComboboxPrimitive.Input
            ref={inputRef}
            aria-label={ariaLabel}
            placeholder={inputPlaceholder}
            className={cn(getInputClassName(variant), 'min-w-28 flex-1')}
            {...inputProps}
          />
        </ComboboxPrimitive.Chips>
        {clearLabel && value.length > 0 && (
          <ComboboxPrimitive.Clear
            aria-label={clearLabel}
            title={clearLabel}
            className="mr-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          >
            <XIcon className="size-3.5" />
          </ComboboxPrimitive.Clear>
        )}
        <ComboboxTrigger ariaLabel={ariaLabel} />
      </ComboboxPrimitive.InputGroup>
      <ComboboxPopup
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
}

function ComboboxTrigger({ ariaLabel }: { ariaLabel: string | undefined }) {
  return (
    <ComboboxPrimitive.Trigger
      aria-label={ariaLabel ? `Show ${ariaLabel.toLowerCase()} options` : 'Show options'}
      className="group mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
    >
      <CaretDownIcon className="size-4 transition-transform group-data-popup-open:rotate-180" />
    </ComboboxPrimitive.Trigger>
  );
}

interface ComboboxPopupProps {
  optionMap: Map<string, ComboboxOption>;
  optionGroups: ComboboxOptionGroup[] | null;
  emptyMessage: React.ReactNode;
  portalContainer: HTMLElement | null;
  contentClassName: string | undefined;
  listFooter: React.ReactNode;
  footer: React.ReactNode;
}

function ComboboxPopup({
  optionMap,
  optionGroups,
  emptyMessage,
  portalContainer,
  contentClassName,
  listFooter,
  footer,
}: ComboboxPopupProps) {
  return (
    <ComboboxPrimitive.Portal container={portalContainer ?? undefined} style={{ display: 'contents' }}>
      <ComboboxPrimitive.Positioner className="z-50 outline-none" sideOffset={4} align="start">
        <ComboboxPrimitive.Popup
          className={cn(
            'w-(--anchor-width) min-w-[min(16rem,calc(100vw-2rem))] max-w-[min(32rem,calc(100vw-2rem))] origin-(--transform-origin) overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            contentClassName,
          )}
        >
          <ComboboxPrimitive.Empty className="text-center text-sm text-muted-foreground">
            <span className="block px-3 py-6">{emptyMessage}</span>
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List className="max-h-[min(var(--available-height),18rem)] overflow-y-auto p-1 outline-none">
            {optionGroups ? (
              <GroupedComboboxOptions optionMap={optionMap} />
            ) : (
              <ComboboxPrimitive.Collection>
                {(optionValue: string, index: number) => {
                  const option = optionMap.get(optionValue);

                  if (!option) {
                    return null;
                  }

                  return <ComboboxItem key={option.value} option={option} index={index} />;
                }}
              </ComboboxPrimitive.Collection>
            )}
            {listFooter}
          </ComboboxPrimitive.List>
          {footer && <div className="border-t p-1">{footer}</div>}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

interface ComboboxOptionGroup {
  label: string;
  items: string[];
}

function GroupedComboboxOptions({ optionMap }: { optionMap: Map<string, ComboboxOption> }) {
  return (
    <ComboboxPrimitive.Collection>
      {(group: ComboboxOptionGroup) => (
        <ComboboxPrimitive.Group
          key={group.label}
          items={group.items}
          className="border-t border-border/60 first:border-t-0"
        >
          <ComboboxPrimitive.GroupLabel className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
            {group.label}
          </ComboboxPrimitive.GroupLabel>
          <ComboboxPrimitive.Collection>
            {(optionValue: string) => {
              const option = optionMap.get(optionValue);

              if (!option) {
                return null;
              }

              return <ComboboxItem key={option.value} option={option} />;
            }}
          </ComboboxPrimitive.Collection>
        </ComboboxPrimitive.Group>
      )}
    </ComboboxPrimitive.Collection>
  );
}

function useComboboxOptions(options: readonly ComboboxOption[]) {
  const optionMap = React.useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);

  const optionValues = React.useMemo(() => options.map((option) => option.value), [options]);

  const optionGroups = React.useMemo(() => buildOptionGroups(options), [options]);

  return { optionMap, optionValues, optionGroups };
}

function ComboboxItem({ option, index }: { option: ComboboxOption; index?: number }) {
  return (
    <ComboboxPrimitive.Item
      value={option.value}
      index={index}
      disabled={option.disabled}
      className="relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl py-2 pr-9 pl-3 text-sm outline-none transition-colors select-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
    >
      {option.leading && <span className="shrink-0">{option.leading}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{option.label}</span>
        {option.description && <span className="truncate text-xs text-muted-foreground">{option.description}</span>}
      </span>
      {option.trailing && <span className="shrink-0 text-xs text-muted-foreground">{option.trailing}</span>}
      <ComboboxPrimitive.ItemIndicator className="absolute right-3 flex size-4 items-center justify-center">
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function buildOptionGroups(options: readonly ComboboxOption[]): ComboboxOptionGroup[] | null {
  if (!options.some((option) => option.group)) {
    return null;
  }

  const groups = new Map<string, string[]>();

  for (const option of options) {
    const groupLabel = option.group ?? 'Other';
    const groupItems = groups.get(groupLabel);

    if (groupItems) {
      groupItems.push(option.value);
    } else {
      groups.set(groupLabel, [option.value]);
    }
  }

  return [...groups].map(([label, items]) => ({ label, items }));
}

function useComboboxOpen(controlledOpen: boolean | undefined, onOpenChange: ((open: boolean) => void) | undefined) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange],
  );

  return [open, setOpen] as const;
}

function useComboboxOverlay({
  forwardedRef,
  open,
  portalContainerRef,
  setOpen,
  keepOpenOnItemPress = false,
}: {
  forwardedRef: React.ForwardedRef<HTMLInputElement>;
  open: boolean;
  portalContainerRef: React.RefObject<HTMLElement | null> | undefined;
  setOpen: (open: boolean) => void;
  keepOpenOnItemPress?: boolean;
}) {
  const inputElementRef = React.useRef<HTMLInputElement | null>(null);
  const [localPortalContainer, setLocalPortalContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };

    window.addEventListener('keydown', handleEscape, true);

    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [open, setOpen]);

  const inputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputElementRef.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean, eventDetails: ComboboxPrimitive.Root.ChangeEventDetails) => {
      if (!nextOpen && keepOpenOnItemPress && eventDetails.reason === 'item-press') {
        return;
      }

      if (nextOpen && !portalContainerRef?.current) {
        setLocalPortalContainer(inputElementRef.current?.closest<HTMLElement>(OVERLAY_CONTENT_SELECTOR) ?? null);
      }

      setOpen(nextOpen);
    },
    [keepOpenOnItemPress, portalContainerRef, setOpen],
  );

  return {
    inputRef,
    portalContainer: portalContainerRef?.current ?? localPortalContainer,
    handleOpenChange,
  };
}

function getInputGroupClassName({
  variant,
  size,
  multiple,
  className,
}: {
  variant: 'input' | 'ghost';
  size: 'sm' | 'default' | 'lg';
  multiple: boolean;
  className: string | undefined;
}) {
  return cn(
    'flex max-w-full min-w-0 items-center gap-1 bg-clip-padding text-sm transition-colors outline-none has-[:focus-visible]:border-ring has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring/50 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-[3px] has-[[aria-invalid=true]]:ring-destructive/20 dark:has-[[aria-invalid=true]]:border-destructive/50 dark:has-[[aria-invalid=true]]:ring-destructive/40',
    variant === 'input' &&
      'w-full rounded-4xl border border-control-border bg-control px-1 hover:border-control-border-hover hover:bg-control-hover',
    variant === 'ghost' && 'w-fit rounded-xl bg-transparent px-0 hover:bg-accent/60',
    !multiple && size === 'sm' && 'h-8',
    !multiple && size === 'default' && 'h-9',
    !multiple && size === 'lg' && 'h-10',
    multiple && size === 'sm' && 'min-h-8 py-0.5',
    multiple && size === 'default' && 'min-h-9 py-1',
    multiple && size === 'lg' && 'min-h-10 py-1.5',
    className,
  );
}

function getInputClassName(variant: 'input' | 'ghost') {
  return cn(
    'h-full min-w-0 flex-1 bg-transparent px-2 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'ghost' && 'px-1',
  );
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

function defaultSelectedOverflowLabel(hiddenCount: number) {
  return `+${hiddenCount}`;
}

function optionMatchesQuery(option: ComboboxOption | undefined, query: string) {
  if (!option) {
    return false;
  }

  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [option.label, option.searchValue, option.description, option.group]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}
