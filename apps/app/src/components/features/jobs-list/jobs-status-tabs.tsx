import { Skeleton } from '@comitium/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { memo, useCallback } from 'react';
import type { StatusFilter } from '@/hooks/queries/use-query-jobs-with-drafts';

interface StatusTab {
  value: StatusFilter;
  label: string;
}

const STATUS_TABS: StatusTab[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_TAB_VALUES = STATUS_TABS.map((tab) => tab.value);

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_TAB_VALUES.includes(value as StatusFilter);
}

interface StatusTabTriggerProps {
  value: StatusFilter;
  label: string;
  count: number;
  loading: boolean;
}

const StatusTabTrigger = memo(function StatusTabTrigger({ value, label, count, loading }: StatusTabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      aria-label={loading ? `${label} loading` : `${label} ${count}`}
      aria-busy={loading}
      className="group gap-1.5 rounded-3xl px-3 text-button-14 dark:data-active:border-transparent dark:data-active:bg-secondary"
    >
      {label}
      <span className="inline-flex h-5 min-w-3 items-center justify-center text-label-12 font-semibold leading-none text-muted-foreground tabular-nums group-data-[state=active]:text-foreground/70">
        {loading ? <Skeleton className="h-2.5 w-3 rounded-sm" /> : count}
      </span>
    </TabsTrigger>
  );
});

interface JobsStatusTabsProps {
  status: StatusFilter;
  counts: Record<StatusFilter, number>;
  loading?: boolean;
  onChange: (status: StatusFilter) => void;
}

export function JobsStatusTabs({ status, counts, loading = false, onChange }: JobsStatusTabsProps) {
  const handleValueChange = useCallback(
    (value: string) => {
      if (isStatusFilter(value)) {
        onChange(value);
      }
    },
    [onChange],
  );

  const triggers = STATUS_TABS.map((tab) => (
    <StatusTabTrigger key={tab.value} value={tab.value} label={tab.label} count={counts[tab.value]} loading={loading} />
  ));

  return (
    <Tabs value={status} onValueChange={handleValueChange} className="w-fit max-w-full">
      <div className="w-fit max-w-full max-sm:overflow-x-auto max-sm:scrollbar-hide">
        <TabsList className="min-w-max p-0.5 group-data-horizontal/tabs:h-9">{triggers}</TabsList>
      </div>
    </Tabs>
  );
}
