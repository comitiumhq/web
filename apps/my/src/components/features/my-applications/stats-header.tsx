import { Card } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import { memo, useCallback } from 'react';
import type { ApplicationFilter, Stats } from './utils';

export type FilterValue = ApplicationFilter | null;

interface StatsHeaderProps {
  stats: Stats;
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}

interface StatCardProps {
  label: string;
  accessibilityLabel: string;
  value: string;
  filter: ApplicationFilter;
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}

function getStatButtonLabel(accessibilityLabel: string, value: string, isActive: boolean): string {
  if (isActive) {
    return `${accessibilityLabel}, ${value}, selected. Activate to clear this filter.`;
  }

  return `${accessibilityLabel}, ${value}. Activate to filter the list.`;
}

const StatCard = memo(function StatCard({
  label,
  accessibilityLabel,
  value,
  filter,
  activeFilter,
  onFilterChange,
}: StatCardProps) {
  const isActive = activeFilter === filter;
  const buttonLabel = getStatButtonLabel(accessibilityLabel, value, isActive);

  const handleClick = useCallback(() => {
    onFilterChange(isActive ? null : filter);
  }, [filter, isActive, onFilterChange]);

  return (
    <Card
      className={cn('min-h-[5.5rem] gap-0 py-0 transition-colors', {
        'hover:bg-muted/30 hover:ring-foreground/20': !isActive,
        'bg-muted/50 ring-foreground/25': isActive,
      })}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={buttonLabel}
        aria-pressed={isActive}
        className="flex min-h-[5.5rem] w-full cursor-pointer flex-col px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className={cn('text-label-14 text-muted-foreground', { 'text-foreground': isActive })}>{label}</p>
        <p className="text-heading-20 mt-1">{value}</p>
      </button>
    </Card>
  );
});

export function StatsHeader({ stats, activeFilter, onFilterChange }: StatsHeaderProps) {
  return (
    <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <legend className="sr-only">Application filters</legend>
      <StatCard
        label="Active"
        accessibilityLabel="Active applications"
        value={String(stats.active)}
        filter="active"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <StatCard
        label="Needs action"
        accessibilityLabel="Applications needing action"
        value={String(stats.action)}
        filter="action"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <StatCard
        label="Closed"
        accessibilityLabel="Closed applications"
        value={String(stats.closed)}
        filter="closed"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </fieldset>
  );
}
