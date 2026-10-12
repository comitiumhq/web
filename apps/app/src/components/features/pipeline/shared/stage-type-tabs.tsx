import { Button } from '@comitium/ui/button';
import { PipelineStageTabs } from '@comitium/ui/pipeline-stage-tabs';
import { ArchiveIcon } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
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
  const tabs = useMemo(
    () => STAGE_PIPELINE_TABS.map((tab) => ({ value: tab.key, label: tab.label, count: getTabCount(tab.key, counts) })),
    [counts],
  );

  return <PipelineStageTabs tabs={tabs} value={stageActiveTab} onValueChange={handleValueChange} />;
}

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
      className={cn(
        'h-11 gap-2 rounded-4xl px-4 text-button-14',
        active && 'bg-segment shadow-[var(--segment-shadow)]',
      )}
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
