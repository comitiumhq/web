import type { CandidateProfile } from '@comitium/schemas/candidates';
import { Card } from '@comitium/ui/card';
import { PageContainer } from '@comitium/ui/page-container';
import { Skeleton } from '@comitium/ui/skeleton';
import { CaretRightIcon } from '@phosphor-icons/react';
import { type CSSProperties, Fragment, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { PipelineTab } from '../types';
import { getCandidateColumns } from './candidate-table/columns';

const TAB_SKELETONS = [
  { key: 'review', widthClassName: 'w-28' },
  { key: 'active', widthClassName: 'w-12' },
  { key: 'offer', widthClassName: 'w-10' },
  { key: 'hired', widthClassName: 'w-10' },
] as const;
const KANBAN_COLUMN_SKELETONS = [
  { cards: 2, titleWidth: 'w-36' },
  { cards: 2, titleWidth: 'w-40' },
  { cards: 3, titleWidth: 'w-52' },
  { cards: 1, titleWidth: 'w-28' },
] as const;

type TableSkeletonVariant = Exclude<PipelineTab, 'active'>;
type TableSkeletonScope = 'global' | 'job';
type TableSkeletonColumn =
  | 'candidate'
  | 'job'
  | 'status'
  | 'deadline'
  | 'criteria'
  | 'date'
  | 'outcome'
  | 'reason'
  | 'stage';

interface TableSkeletonColumnLayout {
  id: string;
  gridSize: string;
  type: TableSkeletonColumn;
}

interface PipelineContentSkeletonProps {
  activeTab: PipelineTab;
  className?: string;
}

interface GlobalPipelineContentSkeletonProps {
  activeTab: PipelineTab;
}

interface PipelineTableSkeletonProps {
  activeTab?: TableSkeletonVariant;
  className?: string;
  rows?: number;
  scope?: TableSkeletonScope;
  showSearch?: boolean;
}

interface JobAccordionSkeletonProps {
  expanded?: boolean;
}

const EMPTY_CANDIDATE_NAMES = new Map<string, CandidateProfile>();

export function PipelineStageControlsSkeleton({
  activeTab = 'review',
  showSearch = false,
}: {
  activeTab?: PipelineTab;
  showSearch?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex w-full shrink-0 items-center justify-between gap-3',
        showSearch && 'flex-col items-stretch xl:flex-row xl:items-center',
      )}
    >
      <div className="min-w-0 overflow-hidden">
        <div className="flex min-w-max items-center rounded-4xl border border-input bg-input/30 p-1">
          {TAB_SKELETONS.map(({ key, widthClassName }, index) => (
            <Fragment key={key}>
              {index > 0 && (
                <CaretRightIcon aria-hidden weight="bold" className="mx-0.5 size-4 shrink-0 text-muted-foreground/25" />
              )}
              <div
                className={cn('flex h-9 items-center gap-1.5 rounded-3xl px-3.5', activeTab === key && 'bg-secondary')}
              >
                <Skeleton className="h-4 w-6" />
                <Skeleton className={cn('h-3', widthClassName)} />
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <div className={cn('flex shrink-0 items-center gap-2', showSearch && 'min-w-0')}>
        {showSearch && <Skeleton className="h-11 min-w-0 flex-1 rounded-4xl xl:w-64 xl:flex-none" />}
        <div className="flex h-11 shrink-0 items-center gap-2 rounded-4xl border border-input px-4">
          <Skeleton className="size-4 rounded-md" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="size-5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function PerJobPipelinePageSkeleton({ activeTab }: { activeTab: PipelineTab }) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <PageContainer className="flex min-h-0 flex-1 flex-col gap-4 py-4 sm:py-5">
        <PipelineStageControlsSkeleton activeTab={activeTab} />
        <PipelineContentSkeleton activeTab={activeTab} className="min-h-0 flex-1" />
      </PageContainer>
    </div>
  );
}

export function GlobalPipelineContentSkeleton({ activeTab }: GlobalPipelineContentSkeletonProps) {
  if (activeTab !== 'active') {
    return (
      <PageContainer className="flex min-h-0 flex-1 flex-col pb-6">
        <PipelineTableSkeleton activeTab={activeTab} rows={10} scope="global" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-3 pb-6">
      <JobAccordionSkeleton expanded />
      <JobAccordionSkeleton />
      <JobAccordionSkeleton />
    </PageContainer>
  );
}

export function PipelineContentSkeleton({ activeTab, className }: PipelineContentSkeletonProps) {
  if (activeTab === 'active') {
    return (
      <Card size="sm" className={cn('min-h-0 flex-1 py-0', className)}>
        <KanbanBoardSkeleton />
      </Card>
    );
  }

  return (
    <PipelineTableSkeleton
      activeTab={activeTab}
      className={cn('min-h-0 flex-1', className)}
      scope="job"
      showSearch={activeTab !== 'archived'}
    />
  );
}

export function KanbanBoardSkeleton() {
  const columns = KANBAN_COLUMN_SKELETONS.map((column, index) => (
    <div key={column.titleWidth} className="w-72 shrink-0 p-2">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className={cn('h-5', column.titleWidth)} />
        <Skeleton className="size-6 rounded-full" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: column.cards }).map((_, cardIndex) => (
          <PipelineCandidateCardSkeleton key={`${index}-${cardIndex}`} />
        ))}
      </div>
    </div>
  ));

  return <div className="flex h-full w-full min-w-0 max-w-full overflow-x-auto p-4">{columns}</div>;
}

export function PipelineTableSkeleton({
  activeTab = 'review',
  className,
  rows = 8,
  scope = 'global',
  showSearch = false,
}: PipelineTableSkeletonProps) {
  const columns = useMemo(() => getTableSkeletonLayout(activeTab, scope), [activeTab, scope]);
  const gridTemplateColumns = useMemo(() => columns.map((column) => column.gridSize).join(' '), [columns]);
  const gridStyle = useMemo<CSSProperties>(() => ({ gridTemplateColumns }), [gridTemplateColumns]);

  return (
    <div className={cn('flex min-h-0 flex-col gap-3', className)}>
      {showSearch && (
        <div className="flex shrink-0">
          <Skeleton className="h-11 w-full rounded-4xl sm:w-[230px]" />
        </div>
      )}

      <Card size="sm" className="min-h-0 overflow-hidden py-0">
        <div className="grid min-h-11 items-center bg-muted" style={gridStyle}>
          {columns.map((column, index) => (
            <div key={column.id} className={cn('min-w-0 overflow-hidden px-3', index === 0 && 'pl-4')}>
              <Skeleton className={cn('h-3.5 max-w-full bg-foreground/10', getTableSkeletonHeaderWidth(column.type))} />
            </div>
          ))}
        </div>

        <div>
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="grid min-h-[68px] items-center border-b border-border last:border-b-0"
              style={gridStyle}
            >
              {columns.map((column, cellIndex) => (
                <div key={column.id} className={cn('min-w-0 overflow-hidden px-3 py-3', cellIndex === 0 && 'pl-4')}>
                  <TableSkeletonCell column={column.type} rowIndex={index} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TableSkeletonCell({ column, rowIndex }: { column: TableSkeletonColumn; rowIndex: number }) {
  if (column === 'candidate') {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton className={cn('h-3.5 max-w-full', rowIndex % 3 === 0 ? 'w-28' : 'w-36')} />
        <Skeleton className={cn('h-3 max-w-full', rowIndex % 2 === 0 ? 'w-48' : 'w-40')} />
      </div>
    );
  }

  if (column === 'status') {
    return <Skeleton className={cn('h-6 rounded-4xl', rowIndex % 3 === 0 ? 'w-28' : 'w-36')} />;
  }

  if (column === 'deadline') {
    return <Skeleton className={cn(rowIndex % 3 === 1 ? 'h-3 w-3' : 'h-6 w-16 rounded-4xl')} />;
  }

  if (column === 'criteria') {
    return <Skeleton className="h-6 w-10 rounded-4xl" />;
  }

  const widths: Record<Exclude<TableSkeletonColumn, 'candidate' | 'status' | 'deadline' | 'criteria'>, string> = {
    job: rowIndex % 3 === 0 ? 'w-52' : 'w-44',
    date: 'w-14',
    outcome: rowIndex % 2 === 0 ? 'w-24' : 'w-28',
    reason: rowIndex % 2 === 0 ? 'w-32' : 'w-24',
    stage: 'w-24',
  };

  return <Skeleton className={cn('h-3.5 max-w-full', widths[column])} />;
}

function getTableSkeletonLayout(
  activeTab: TableSkeletonVariant,
  scope: TableSkeletonScope,
): TableSkeletonColumnLayout[] {
  if (activeTab === 'archived') {
    const lead: TableSkeletonColumnLayout[] = [{ id: 'candidate', gridSize: 'minmax(15rem,1.2fr)', type: 'candidate' }];

    if (scope === 'global') {
      lead.push({ id: 'job', gridSize: 'minmax(13rem,1fr)', type: 'job' });
    }

    return [
      ...lead,
      { id: 'outcome', gridSize: 'minmax(10rem,0.8fr)', type: 'outcome' },
      { id: 'reason', gridSize: 'minmax(10rem,1fr)', type: 'reason' },
      { id: 'stage', gridSize: 'minmax(8rem,0.8fr)', type: 'stage' },
      { id: 'terminal', gridSize: '8rem', type: 'date' },
    ];
  }

  return getCandidateColumns(activeTab, {
    namesMap: EMPTY_CANDIDATE_NAMES,
    orgId: '',
    showJob: false,
    timezone: 'UTC',
    scope,
  }).map((column, index) => ({
    id: column.id ?? `column-${index}`,
    gridSize: column.meta?.gridSize ?? 'minmax(0,1fr)',
    type: getCandidateSkeletonColumnType(column.id),
  }));
}

function getTableSkeletonHeaderWidth(column: TableSkeletonColumn): string {
  const widths: Record<TableSkeletonColumn, string> = {
    candidate: 'w-20',
    job: 'w-8',
    status: 'w-12',
    deadline: 'w-16',
    criteria: 'w-14',
    date: 'w-14',
    outcome: 'w-16',
    reason: 'w-14',
    stage: 'w-12',
  };

  return widths[column];
}

function getCandidateSkeletonColumnType(columnId?: string): TableSkeletonColumn {
  if (
    columnId === 'candidate' ||
    columnId === 'job' ||
    columnId === 'status' ||
    columnId === 'deadline' ||
    columnId === 'criteria'
  ) {
    return columnId;
  }

  return 'date';
}

function JobAccordionSkeleton({ expanded = false }: JobAccordionSkeletonProps) {
  return (
    <Card size="sm" className="gap-0 border border-border py-0 ring-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
        <Skeleton className="size-8 rounded-full" />

        <div className="min-w-0 py-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-72 max-w-[65%]" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3.5 w-40" />
        </div>

        <Skeleton className="size-8 rounded-4xl" />
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/50">
          <KanbanBoardSkeleton />
        </div>
      )}
    </Card>
  );
}

function PipelineCandidateCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-2 h-4 w-24" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-6 w-32 rounded-4xl" />
        <Skeleton className="h-6 w-24 rounded-4xl" />
      </div>
    </div>
  );
}
