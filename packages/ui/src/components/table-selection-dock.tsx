import { type Icon as PhosphorIcon, XIcon } from '@phosphor-icons/react';
import { cn } from '../lib/cn';
import { Button } from './button';

export interface TableSelectionDockAction {
  id: string;
  label: string;
  icon?: PhosphorIcon;
  disabled?: boolean;
  destructive?: boolean;
  onSelect: () => void;
}

interface TableSelectionDockProps {
  selectedCount: number;
  selectedLabel?: string;
  actions: readonly TableSelectionDockAction[];
  onClear: () => void;
  className?: string;
}

export function TableSelectionDock({
  selectedCount,
  selectedLabel,
  actions,
  onClear,
  className,
}: TableSelectionDockProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      data-slot="table-selection-dock"
      role="toolbar"
      aria-label="Actions for selected rows"
      className={cn(
        'absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1.5 rounded-4xl border border-border/80 bg-popover/95 p-1.5 pl-4 text-popover-foreground shadow-xl backdrop-blur-xl',
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2',
        className,
      )}
    >
      <span className="mr-1 shrink-0 text-sm font-medium tabular-nums">
        {selectedLabel ?? `${selectedCount} selected`}
      </span>

      <div className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />

      <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-hide">
        {actions.map((action) => {
          const ActionIcon = action.icon;

          return (
            <Button
              key={action.id}
              type="button"
              size="sm"
              variant={action.destructive ? 'destructive' : 'ghost'}
              disabled={action.disabled}
              onClick={action.onSelect}
            >
              {ActionIcon ? <ActionIcon data-icon="inline-start" /> : null}
              <span className="max-sm:sr-only">{action.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />

      <Button type="button" size="icon-sm" variant="ghost" aria-label="Clear selection" onClick={onClear}>
        <XIcon />
      </Button>
    </div>
  );
}
