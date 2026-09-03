import { Button } from '@comitium/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { ArchiveIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Fragment, memo, useCallback } from 'react';
import type { StageTypeCounts } from '@/lib/schemas/pipeline';
import { cn } from '@/lib/utils';

import type { PipelineTab } from '../types';

type StagePipelineTab = Exclude<PipelineTab, 'archived'>;

const STAGE_PIPELINE_TABS: { key: StagePipelineTab; label: string }[] = [
  { key: 'review', label: 'Application review' },
  { key: 'active', label: 'Active' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
];

const STAGE_PIPELINE_TAB_VALUES = STAGE_PIPELINE_TABS.map((tab) => tab.key);

interface StageTypeTabsProps {
  counts: StageTypeCounts;
  activeTab: PipelineTab;
  onTabChange: (tab: PipelineTab) => void;
}

interface StageTypeTabTriggerProps {
  tab: StagePipelineTab;
  label: string;
  count: number;
}

interface ArchivedPipelineButtonProps {
  count: number;
  active: boolean;
  onClick: () => void;
}

export function StageTypeTabs({ counts, activeTab, onTabChange }: StageTypeTabsProps) {
  const handleValueChange = useCallback(
    (value: string) => {
      if (isStagePipelineTab(value)) {
        onTabChange(value);
      }
    },
    [onTabChange],
  );

  const stageActiveTab = isStagePipelineTab(activeTab) ? activeTab : '';

  return (
    <Tabs value={stageActiveTab} onValueChange={handleValueChange} className="w-fit max-w-full">
      <div className="w-fit max-w-full max-sm:overflow-x-auto max-sm:scrollbar-hide">
        <TabsList className="min-w-max p-1 group-data-horizontal/tabs:h-auto">
          {STAGE_PIPELINE_TABS.map((tab, index) => (
            <Fragment key={tab.key}>
              {index > 0 && (
                <CaretRightIcon aria-hidden weight="bold" className="mx-0.5 size-4 shrink-0 text-muted-foreground/50" />
              )}
              <StageTypeTabTrigger tab={tab.key} label={tab.label} count={getTabCount(tab.key, counts)} />
            </Fragment>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}

const StageTypeTabTrigger = memo(function StageTypeTabTrigger({ tab, label, count }: StageTypeTabTriggerProps) {
  return (
    <TabsTrigger
      value={tab}
      aria-label={`${label} ${count}`}
      className="group h-9 flex-none items-center rounded-3xl px-3.5 dark:data-active:border-transparent dark:data-active:bg-secondary"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="text-label-13 font-semibold leading-none tabular-nums text-muted-foreground group-data-[state=active]:text-foreground/70">
          {count}
        </span>
        <span className="text-button-14 leading-none text-muted-foreground group-data-[state=active]:text-foreground">
          {label}
        </span>
      </span>
    </TabsTrigger>
  );
});

export const ArchivedPipelineButton = memo(function ArchivedPipelineButton({
  count,
  active,
  onClick,
}: ArchivedPipelineButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      aria-pressed={active}
      aria-label={`Archived ${count}`}
      className={cn('h-11 gap-2 rounded-4xl px-4 text-button-14', active && 'bg-background dark:bg-secondary')}
      onClick={onClick}
    >
      <ArchiveIcon data-icon="inline-start" />
      Archived
      <span className="text-label-12 font-semibold leading-none text-muted-foreground tabular-nums">{count}</span>
    </Button>
  );
});

function isStagePipelineTab(value: string): value is StagePipelineTab {
  return STAGE_PIPELINE_TAB_VALUES.includes(value as StagePipelineTab);
}

function getTabCount(tab: StagePipelineTab, counts: StageTypeCounts): number {
  return counts[tab];
}
