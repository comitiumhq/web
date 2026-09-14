import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import * as React from 'react';
import { cn } from '../lib/cn';

const OVERLAY_CONTENT_SELECTOR =
  '[data-slot="sheet-content"], [data-slot="dialog-content"], [data-slot="popover-content"]';

export interface SelectionOption {
  value: string;
  label: string;
  searchValue?: string;
  description?: string;
  group?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectionFieldCommonProps
  extends Omit<
    React.ComponentProps<'input'>,
    'children' | 'className' | 'defaultValue' | 'disabled' | 'onChange' | 'placeholder' | 'ref' | 'size' | 'value'
  > {
  options: readonly SelectionOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: React.ReactNode;
  disabled?: boolean;
  clearLabel?: string;
  variant?: 'input' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  contentClassName?: string;
  portalContainerRef?: React.RefObject<HTMLElement | null>;
  ariaLabel?: string;
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  listFooter?: React.ReactNode;
  footer?: React.ReactNode;
  startContent?: React.ReactNode;
}

interface SelectionOptionGroup {
  label: string;
  items: string[];
}

interface SelectionFieldPopupProps {
  optionMap: Map<string, SelectionOption>;
  optionGroups: SelectionOptionGroup[] | null;
  emptyMessage: React.ReactNode;
  portalContainer: HTMLElement | null;
  contentClassName: string | undefined;
  searchInput?: React.ReactNode;
  listFooter: React.ReactNode;
  footer: React.ReactNode;
}

export function SelectionFieldPopup({
  optionMap,
  optionGroups,
  emptyMessage,
  portalContainer,
  contentClassName,
  searchInput,
  listFooter,
  footer,
}: SelectionFieldPopupProps) {
  return (
    <ComboboxPrimitive.Portal container={portalContainer ?? undefined} style={{ display: 'contents' }}>
      <ComboboxPrimitive.Positioner className="z-50 outline-none" sideOffset={4} align="start">
        <ComboboxPrimitive.Popup
          className={cn(
            'w-(--anchor-width) min-w-[min(16rem,calc(100vw-2rem))] max-w-[min(32rem,calc(100vw-2rem))] origin-(--transform-origin) overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            contentClassName,
          )}
        >
          {searchInput}
          <ComboboxPrimitive.Empty className="text-center text-sm text-muted-foreground">
            <span className="block px-3 py-6">{emptyMessage}</span>
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List
            className={cn('overflow-y-auto p-1 outline-none', {
              'max-h-[min(var(--available-height),18rem)]': !searchInput,
              'max-h-[min(calc(var(--available-height)-3rem),18rem)]': searchInput,
            })}
          >
            {optionGroups ? (
              <GroupedSelectionOptions optionMap={optionMap} />
            ) : (
              <ComboboxPrimitive.Collection>
                {(optionValue: string, index: number) => {
                  const option = optionMap.get(optionValue);

                  return option ? <SelectionFieldItem key={option.value} option={option} index={index} /> : null;
                }}
              </ComboboxPrimitive.Collection>
            )}
            {listFooter}
          </ComboboxPrimitive.List>
          {footer && <div className="border-t border-separator p-1">{footer}</div>}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function GroupedSelectionOptions({ optionMap }: { optionMap: Map<string, SelectionOption> }) {
  return (
    <ComboboxPrimitive.Collection>
      {(group: SelectionOptionGroup) => (
        <ComboboxPrimitive.Group
          key={group.label}
          items={group.items}
          className="border-t border-separator first:border-t-0"
        >
          <ComboboxPrimitive.GroupLabel className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
            {group.label}
          </ComboboxPrimitive.GroupLabel>
          <ComboboxPrimitive.Collection>
            {(optionValue: string) => {
              const option = optionMap.get(optionValue);

              return option ? <SelectionFieldItem key={option.value} option={option} /> : null;
            }}
          </ComboboxPrimitive.Collection>
        </ComboboxPrimitive.Group>
      )}
    </ComboboxPrimitive.Collection>
  );
}

function SelectionFieldItem({ option, index }: { option: SelectionOption; index?: number }) {
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

export function SelectionFieldTrigger({ label }: { label: string }) {
  return (
    <ComboboxPrimitive.Trigger
      aria-label={label}
      className="group mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
    >
      <CaretDownIcon className="size-4 transition-transform group-data-popup-open:rotate-180" />
    </ComboboxPrimitive.Trigger>
  );
}

export function useSelectionFieldOptions(options: readonly SelectionOption[]) {
  const optionMap = React.useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
  const optionValues = React.useMemo(() => options.map((option) => option.value), [options]);
  const optionGroups = React.useMemo(() => buildOptionGroups(options), [options]);

  return { optionMap, optionValues, optionGroups };
}

function buildOptionGroups(options: readonly SelectionOption[]): SelectionOptionGroup[] | null {
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

interface SelectionFieldOverlayOptions {
  forwardedRef: React.ForwardedRef<HTMLInputElement>;
  controlledOpen: boolean | undefined;
  onOpenChange: ((open: boolean) => void) | undefined;
  portalContainerRef: React.RefObject<HTMLElement | null> | undefined;
  keepOpenOnItemPress: boolean;
}

export function useSelectionFieldOverlay({
  forwardedRef,
  controlledOpen,
  onOpenChange,
  portalContainerRef,
  keepOpenOnItemPress,
}: SelectionFieldOverlayOptions) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [localPortalContainer, setLocalPortalContainer] = React.useState<HTMLElement | null>(null);
  const inputElementRef = React.useRef<HTMLInputElement | null>(null);
  const portalAnchorElementRef = React.useRef<HTMLElement | null>(null);
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

  const portalAnchorRef = React.useCallback((node: HTMLElement | null) => {
    portalAnchorElementRef.current = node;
  }, []);

  React.useLayoutEffect(() => {
    if (!open || portalContainerRef?.current) {
      return;
    }

    const portalAnchor = portalAnchorElementRef.current ?? inputElementRef.current;
    const nextPortalContainer = portalAnchor?.closest<HTMLElement>(OVERLAY_CONTENT_SELECTOR) ?? null;

    setLocalPortalContainer((current) => (current === nextPortalContainer ? current : nextPortalContainer));
  }, [open, portalContainerRef]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean, eventDetails: ComboboxPrimitive.Root.ChangeEventDetails) => {
      if (!nextOpen && keepOpenOnItemPress && eventDetails.reason === 'item-press') {
        return;
      }

      if (nextOpen && !portalContainerRef?.current) {
        const portalAnchor = portalAnchorElementRef.current ?? inputElementRef.current;

        setLocalPortalContainer(portalAnchor?.closest<HTMLElement>(OVERLAY_CONTENT_SELECTOR) ?? null);
      }

      setOpen(nextOpen);
    },
    [keepOpenOnItemPress, portalContainerRef, setOpen],
  );

  return {
    open,
    inputRef,
    portalAnchorRef,
    portalContainer: portalContainerRef?.current ?? localPortalContainer,
    handleOpenChange,
  };
}

export function getSelectionInputGroupClassName({
  variant,
  size,
  className,
}: {
  variant: 'input' | 'ghost';
  size: 'sm' | 'default' | 'lg';
  className: string | undefined;
}) {
  return cn(
    'relative flex max-w-full min-w-0 items-center gap-1 overflow-hidden bg-clip-padding text-sm transition-colors outline-none has-[:focus-visible]:border-ring has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring/50 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-[3px] has-[[aria-invalid=true]]:ring-destructive/20 dark:has-[[aria-invalid=true]]:border-destructive/50 dark:has-[[aria-invalid=true]]:ring-destructive/40',
    {
      'w-full rounded-4xl border border-control-border bg-control px-1 hover:border-control-border-hover hover:bg-control-hover':
        variant === 'input',
      'w-fit rounded-xl bg-transparent px-0 hover:bg-accent/60': variant === 'ghost',
      'h-8': size === 'sm',
      'h-9': size === 'default',
      'h-10': size === 'lg',
    },
    className,
  );
}

export function getSelectionInputClassName(variant: 'input' | 'ghost') {
  return cn(
    'h-full min-w-0 bg-transparent px-2 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm disabled:cursor-not-allowed disabled:opacity-50',
    { 'px-1': variant === 'ghost' },
  );
}

export function optionMatchesQuery(option: SelectionOption | undefined, query: string) {
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

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}
