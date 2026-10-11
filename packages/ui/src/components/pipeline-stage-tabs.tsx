import { CaretRightIcon } from '@phosphor-icons/react';
import { Fragment, memo } from 'react';

import { cn } from '../lib/cn';
import { Tabs, TabsList, TabsTrigger } from './tabs';

export interface PipelineStageTab {
  value: string;
  label: string;
  count: number;
}

interface PipelineStageTabsProps {
  tabs: PipelineStageTab[];
  value: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function PipelineStageTabs({ tabs, value, onValueChange, className }: PipelineStageTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn('w-fit max-w-full', className)}>
      <div className="w-fit max-w-full max-sm:overflow-x-auto max-sm:scrollbar-hide">
        <TabsList className="min-w-max p-1 group-data-horizontal/tabs:h-auto">
          {tabs.map((tab, index) => (
            <Fragment key={tab.value}>
              {index > 0 && (
                <CaretRightIcon aria-hidden weight="bold" className="mx-0.5 size-4 shrink-0 text-muted-foreground/50" />
              )}
              <PipelineStageTabTrigger tab={tab} />
            </Fragment>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}

const PipelineStageTabTrigger = memo(function PipelineStageTabTrigger({ tab }: { tab: PipelineStageTab }) {
  return (
    <TabsTrigger
      value={tab.value}
      aria-label={`${tab.label} ${tab.count}`}
      className="group h-9 flex-none items-center rounded-3xl px-3.5"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="text-label-13 font-medium leading-none text-muted-foreground tabular-nums transition-colors duration-200 ease-out group-hover:text-foreground/70 group-data-[state=active]:text-foreground/70 motion-reduce:transition-none">
          {tab.count}
        </span>
        <span className="text-label-14 leading-none">{tab.label}</span>
      </span>
    </TabsTrigger>
  );
});
