import type { CandidateProfile } from '@comitium/schemas/candidates';
import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { DataTableVirtual } from '@comitium/ui/data-table-virtual';
import {
  type ColumnDef,
  functionalUpdate,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';
import type { PipelineCandidate, PipelineCandidateSorting } from '@/lib/schemas/pipeline';

import { CandidateIdentityCell, DateCell, getCandidateRowId, JobCell, StageCell } from './cells';
import { getArchivedTableGridMinWidth } from './columns';

const ARCHIVED_ROW_ESTIMATE_PX = 68;

interface ArchivedCandidateTableProps {
  className?: string;
  maxHeightClassName?: string;
  candidates: PipelineCandidate[];
  namesMap: Map<string, CandidateProfile>;
  orgId: string;
  sorting: PipelineCandidateSorting;
  hasNextPage?: boolean;
  loadingMore?: boolean;
  maxSelectedRows?: number;
  onCandidateClick?: (candidateId: string) => void;
  onLoadMore?: () => void;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onSortChange: (sorting: PipelineCandidateSorting) => void;
  rowSelection?: RowSelectionState;
}

export function ArchivedCandidateTable({
  className,
  maxHeightClassName,
  candidates,
  namesMap,
  orgId,
  sorting,
  hasNextPage,
  loadingMore,
  maxSelectedRows,
  onCandidateClick,
  onLoadMore,
  onRowSelectionChange,
  onSortChange,
  rowSelection,
}: ArchivedCandidateTableProps) {
  const handleRowClick = useCallback(
    (row: Row<PipelineCandidate>) => {
      onCandidateClick?.(row.original.id);
    },
    [onCandidateClick],
  );
  const columns = useMemo(() => getArchivedColumns({ namesMap, orgId, showJob: false }), [namesMap, orgId]);

  const tableSorting = useMemo<SortingState>(
    () => [{ id: 'terminal', desc: sorting.direction === 'desc' }],
    [sorting.direction],
  );

  const handleSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const primarySort = functionalUpdate(updater, tableSorting)[0];

      if (primarySort?.id !== 'terminal') {
        return;
      }

      onSortChange({
        sort: 'terminal',
        direction: primarySort.desc ? 'desc' : 'asc',
      });
    },
    [onSortChange, tableSorting],
  );

  return (
    <DataTableVirtual
      ariaLabel="Closed applications"
      size="sm"
      enableSortingRemoval={false}
      manualSorting
      className={className}
      maxHeightClassName={maxHeightClassName}
      columns={columns}
      data={candidates}
      enableRowSelection={Boolean(onRowSelectionChange && maxSelectedRows)}
      getRowId={getCandidateRowId}
      gridMinWidth={getArchivedTableGridMinWidth('global')}
      hasNextPage={hasNextPage}
      loadingMore={loadingMore}
      maxSelectedRows={maxSelectedRows}
      onLoadMore={onLoadMore}
      onRowClick={onCandidateClick ? handleRowClick : undefined}
      onRowSelectionChange={onRowSelectionChange}
      onSortingChange={handleSortingChange}
      rowEstimatePx={ARCHIVED_ROW_ESTIMATE_PX}
      rowSelection={rowSelection}
      sorting={tableSorting}
    />
  );
}

function getArchivedColumns(params: {
  namesMap: Map<string, CandidateProfile>;
  orgId: string;
  showJob: boolean;
}): ColumnDef<PipelineCandidate>[] {
  return [
    {
      id: 'candidate',
      header: 'Candidate',
      cell: ({ row }) => {
        const candidate = row.original;
        const profile = params.namesMap.get(candidate.candidateId ?? '') ?? null;

        return <CandidateIdentityCell candidate={candidate} profile={profile} showJob={params.showJob} />;
      },
      enableHiding: false,
      meta: {
        gridSize: 'minmax(15rem,1.2fr)',
        headerClassName: 'pl-4',
        cellClassName: 'pl-4',
        label: 'Candidate',
        skeletonClassName: 'w-36',
      },
    },
    {
      id: 'job',
      header: 'Job',
      cell: ({ row }) => <JobCell candidate={row.original} orgId={params.orgId} />,
      meta: { gridSize: 'minmax(13rem,1fr)', label: 'Job', skeletonClassName: 'w-44' },
    },
    {
      id: 'outcome',
      header: 'Decision',
      cell: ({ row }) => (
        <span className="block truncate text-copy-14 text-muted-foreground">
          {row.original.terminalOutcome ? APPLICATION_TERMINAL_OUTCOME_LABEL[row.original.terminalOutcome] : '—'}
        </span>
      ),
      meta: { gridSize: 'minmax(10rem,0.8fr)', label: 'Decision', skeletonClassName: 'w-28' },
    },
    {
      id: 'reason',
      header: 'Reason',
      cell: ({ row }) => (
        <span
          className="block truncate text-copy-14 text-muted-foreground"
          title={row.original.archiveReasonLabel ?? undefined}
        >
          {row.original.archiveReasonLabel ?? '—'}
        </span>
      ),
      meta: { gridSize: 'minmax(10rem,1fr)', label: 'Reason', skeletonClassName: 'w-32' },
    },
    {
      id: 'stage',
      header: 'Stage',
      cell: ({ row }) => <StageCell candidate={row.original} />,
      meta: { gridSize: 'minmax(8rem,0.8fr)', label: 'Stage', skeletonClassName: 'w-24' },
    },
    {
      id: 'terminal',
      header: 'Closed',
      accessorFn: (candidate) => candidate.terminalOutcomeAt ?? '',
      enableSorting: true,
      cell: ({ row }) => <DateCell iso={row.original.terminalOutcomeAt} />,
      meta: { gridSize: '8rem', label: 'Closed', skeletonClassName: 'w-20' },
    },
  ];
}
