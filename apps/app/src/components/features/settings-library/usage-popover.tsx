import { Button } from '@comitium/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { Skeleton } from '@comitium/ui/skeleton';
import { ArrowUpRightIcon } from '@phosphor-icons/react';
import type { MouseEvent, ReactNode } from 'react';

export const JOB_USAGE_STATUS_LABELS = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
} as const;

export const JOB_TEMPLATE_USAGE_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
} as const;

export const USAGE_LINK_CLASS_NAME =
  'group flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-muted';

function stopClickPropagation(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

interface UsagePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  ariaLabel: string;
  hasUsage: boolean;
  isLoading: boolean;
  error: unknown;
  children: ReactNode;
}

export function UsagePopover({
  open,
  onOpenChange,
  label,
  ariaLabel,
  hasUsage,
  isLoading,
  error,
  children,
}: UsagePopoverProps) {
  if (!hasUsage) {
    return <span className="text-label-14 text-muted-foreground">{label}</span>;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 text-muted-foreground tabular-nums hover:text-foreground"
          aria-label={ariaLabel}
          onClick={stopClickPropagation}
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0" aria-label={ariaLabel}>
        {isLoading ? <UsageLoadingState /> : null}
        {error ? <UsageErrorState /> : null}
        {!isLoading && !error ? children : null}
      </PopoverContent>
    </Popover>
  );
}

function UsageLoadingState() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

function UsageErrorState() {
  return <p className="px-4 py-6 text-center text-copy-14 text-muted-foreground">Couldn&apos;t load usage.</p>;
}

export function UsageEmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-copy-14 text-muted-foreground">{children}</p>;
}

export function UsageSectionTitle({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 text-label-14">
      {label}
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}

export function UsageLinkMeta({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <ArrowUpRightIcon className="size-3.5" />
    </span>
  );
}

export function formatUsageCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

export function formatJobAndTemplateUsageLabel(jobCount: number, jobTemplateCount: number) {
  const parts: string[] = [];

  if (jobCount > 0) {
    parts.push(formatUsageCount(jobCount, 'job'));
  }

  if (jobTemplateCount > 0) {
    parts.push(formatUsageCount(jobTemplateCount, 'template'));
  }

  return parts.length > 0 ? parts.join(' · ') : 'Not used';
}

export function formatJobAndTemplateArchiveImpact(jobCount: number, jobTemplateCount: number) {
  const parts: string[] = [];

  if (jobCount > 0) {
    parts.push(formatUsageCount(jobCount, 'job'));
  }

  if (jobTemplateCount > 0) {
    parts.push(formatUsageCount(jobTemplateCount, 'job template'));
  }

  if (parts.length === 0) {
    return null;
  }

  return `${parts.join(' and ')} will keep using it.`;
}
