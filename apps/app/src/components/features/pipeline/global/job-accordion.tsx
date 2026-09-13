import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comitium/ui/collapsible';
import { ArrowUpRightIcon, CaretDownIcon, UsersIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import type { MouseEvent, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { KanbanBoard } from '@/components/features/pipeline/shared/kanban-board';
import { KanbanBoardSkeleton } from '@/components/features/pipeline/shared/pipeline-skeletons';
import { useQueryKanban } from '@/hooks/queries/use-query-kanban';
import { useDecryptCandidateNames } from '@/hooks/use-decrypt-candidate-names';
import { useKanbanDrag } from '@/hooks/use-kanban-drag';
import type { KanbanApplication, PipelineJob, StageType } from '@/lib/schemas/pipeline';
import { cn, formatLocation } from '@/lib/utils';

interface JobAccordionProps {
  job: PipelineJob;
  orgId: string;
  stageType: StageType;
  defaultExpanded?: boolean;
  onApplicationClick: (applicationId: string) => void;
}

const PANEL_PLACEHOLDER_CLASS_NAME = 'min-h-112';

export function JobAccordion({ job, orgId, stageType, defaultExpanded, onApplicationClick }: JobAccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  const {
    data: kanban,
    isLoading: isKanbanLoading,
    loadNextStage,
    retryStage,
    loadingStageIds,
    failedStageIds,
  } = useQueryKanban(expanded ? job.id : null);

  const activeStageIds = useMemo(
    () => new Set(job.stages.filter((s) => s.stageType === stageType).map((s) => s.id)),
    [job.stages, stageType],
  );

  const filteredKanbanStages = useMemo(
    () => (kanban?.stages ?? []).filter((s) => activeStageIds.has(s.id)),
    [kanban?.stages, activeStageIds],
  );

  const allAccordionApps = useMemo(() => filteredKanbanStages.flatMap((s) => s.applications), [filteredKanbanStages]);
  const namesMap = useDecryptCandidateNames(allAccordionApps, orgId);

  const hasCandidates = filteredKanbanStages.some((s) => s.total > 0);
  const { handleDragEnd } = useKanbanDrag({ stages: filteredKanbanStages, jobId: job.id });
  const activeCount = getStageTypeCount(job, stageType);
  const locationLabel = formatLocation(job.location);
  const subtitle = getJobSubtitle(locationLabel);

  const handleCardClick = useCallback(
    (application: KanbanApplication) => {
      onApplicationClick(application.id);
    },
    [onApplicationClick],
  );

  const handleJobLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  }, []);

  let kanbanContent: ReactNode;

  if (isKanbanLoading) {
    kanbanContent = <KanbanBoardSkeleton className={PANEL_PLACEHOLDER_CLASS_NAME} />;
  } else if (hasCandidates) {
    kanbanContent = (
      <KanbanBoard
        stages={filteredKanbanStages}
        isLoading={false}
        scrollable={false}
        namesMap={namesMap}
        onCardClick={handleCardClick}
        onDragEnd={handleDragEnd}
        onLoadMoreStage={loadNextStage}
        onRetryStage={retryStage}
        loadingStageIds={loadingStageIds}
        failedStageIds={failedStageIds}
      />
    );
  } else {
    kanbanContent = (
      <div
        className={cn('flex flex-col items-center justify-center gap-2 p-8 text-center', PANEL_PLACEHOLDER_CLASS_NAME)}
      >
        <UsersIcon className="size-6 text-muted-foreground" />
        <p className="text-copy-14 text-muted-foreground">No candidates in this stage yet</p>
      </div>
    );
  }

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="group/job-accordion isolate shrink-0 border-b border-separator last:border-b-0"
    >
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="absolute inset-0 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
            aria-label={expanded ? 'Collapse job' : 'Expand job'}
          />
        </CollapsibleTrigger>

        <span
          aria-hidden="true"
          className="pointer-events-none relative z-10 flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        >
          <CaretDownIcon
            className={cn(
              'size-4 transition-transform duration-200 ease-out motion-reduce:transition-none',
              !expanded && '-rotate-90',
            )}
          />
        </span>

        <div className="pointer-events-none relative z-10 min-w-0 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-heading-16">{job.title ?? 'Untitled job'}</h3>
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {activeCount}
            </Badge>
          </div>

          <p className="mt-0.5 truncate text-label-12 text-muted-foreground">{subtitle}</p>
        </div>

        <div className="relative z-20 flex justify-end">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link
              to="/org/$orgId/jobs/$jobId/pipeline"
              params={{ orgId, jobId: job.id }}
              search={{ tab: 'active' }}
              onClick={handleJobLinkClick}
              aria-label="Open job pipeline"
            >
              <ArrowUpRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <CollapsibleContent className="overflow-hidden [--radix-accordion-content-height:var(--radix-collapsible-content-height)] [animation-duration:220ms]! [animation-timing-function:cubic-bezier(0.4,0,0.2,1)]! data-closed:animate-accordion-up data-open:animate-accordion-down motion-reduce:animate-none!">
        <div className="bg-kanban-canvas">{kanbanContent}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function getStageTypeCount(job: PipelineJob, stageType: StageType): number {
  return job.stages
    .filter((stage) => stage.stageType === stageType)
    .reduce((total, stage) => total + stage.candidateCount, 0);
}

function getJobSubtitle(locationLabel: string | null): string {
  if (!locationLabel) {
    return 'Active candidates';
  }

  return `${locationLabel} · Active candidates`;
}
