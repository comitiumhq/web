import type { CandidateProfile } from '@comitium/schemas/candidates';
import { DataTableVirtual } from '@comitium/ui/data-table-virtual';
import { BROWSER_TZ } from '@comitium/ui/date';
import { useMediaQuery } from '@comitium/ui/use-media-query';
import {
  functionalUpdate,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import type { PipelineCandidate, PipelineCandidateSort, PipelineCandidateSorting } from '@/lib/schemas/pipeline';

import { getCandidateRowId } from './cells';
import {
  type CandidateTableScope,
  type CandidateTableVariant,
  getCandidateColumns,
  getResponsiveColumnVisibility,
} from './columns';

export { ArchivedCandidateTable } from './archived-candidate-table';
export type { CandidateTableVariant } from './columns';

const CANDIDATE_ROW_ESTIMATE_PX = 68;
const PIPELINE_SORT_BY_COLUMN_ID: Partial<Record<string, PipelineCandidateSort>> = {
  applied: 'applied',
  criteria: 'criteria',
  inReview: 'inReview',
  updated: 'updated',
  terminal: 'terminal',
};

interface CandidateTableProps {
  className?: string;
  maxHeightClassName?: string;
  variant: CandidateTableVariant;
  scope?: CandidateTableScope;
  candidates: PipelineCandidate[];
  namesMap: Map<string, CandidateProfile>;
  orgId: string;
  sorting?: PipelineCandidateSorting;
  hasNextPage?: boolean;
  loadingMore?: boolean;
  maxSelectedRows?: number;
  onCandidateClick?: (candidateId: string) => void;
  onLoadMore?: () => void;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onSortChange?: (sorting: PipelineCandidateSorting) => void;
  rowSelection?: RowSelectionState;
}

export function CandidateTable({
  className,
  maxHeightClassName,
  variant,
  scope = 'global',
  candidates,
  namesMap,
  orgId,
  sorting: candidateSorting = { sort: 'applied', direction: 'desc' },
  hasNextPage,
  loadingMore,
  maxSelectedRows,
  onCandidateClick,
  onLoadMore,
  onRowSelectionChange,
  onSortChange,
  rowSelection,
}: CandidateTableProps) {
  const { data: me } = useQueryOrgMe(orgId);
  const timezone = me?.timezone ?? BROWSER_TZ;
  const isJobScope = scope === 'job';
  const isTabletTable = useMediaQuery('(max-width: 900px)');
  const isMobileTable = useMediaQuery('(max-width: 680px)');
  const defaultColumnVisibility = useMemo(
    () => getResponsiveColumnVisibility(variant, { isMobileTable, isTabletTable }),
    [variant, isMobileTable, isTabletTable],
  );
  const defaultJobSorting = useMemo(() => getJobDefaultSorting(variant), [variant]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility);
  const [jobSorting, setJobSorting] = useState<SortingState>(defaultJobSorting);
  const sorting = isJobScope ? jobSorting : getCandidateSortingState(candidateSorting);
  const showJobInCandidate = !isJobScope && columnVisibility.job === false;
  const columns = useMemo(
    () => getCandidateColumns(variant, { namesMap, orgId, showJob: showJobInCandidate, timezone, scope }),
    [variant, namesMap, orgId, showJobInCandidate, timezone, scope],
  );

  useEffect(() => {
    setColumnVisibility(defaultColumnVisibility);
  }, [defaultColumnVisibility]);

  useEffect(() => {
    if (isJobScope) {
      setJobSorting(defaultJobSorting);
    }
  }, [defaultJobSorting, isJobScope]);

  const handleSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      if (!onSortChange) {
        return;
      }

      const nextSorting = functionalUpdate(updater, sorting);
      const primarySort = nextSorting[0];

      if (!primarySort) {
        return;
      }

      const nextSort = PIPELINE_SORT_BY_COLUMN_ID[primarySort.id];

      if (!nextSort) {
        return;
      }

      onSortChange({
        sort: nextSort,
        direction: primarySort.desc ? 'desc' : 'asc',
      });
    },
    [onSortChange, sorting],
  );

  const handleCandidateClick = useCallback(
    (row: Row<PipelineCandidate>) => {
      onCandidateClick?.(row.original.id);
    },
    [onCandidateClick],
  );

  const sortingChangeHandler = useMemo<OnChangeFn<SortingState> | undefined>(() => {
    if (isJobScope) {
      return setJobSorting;
    }

    if (onSortChange) {
      return handleSortingChange;
    }

    return undefined;
  }, [isJobScope, onSortChange, handleSortingChange]);

  return (
    <DataTableVirtual
      ariaLabel="Pipeline candidates"
      className={className}
      size="sm"
      enableSortingRemoval={false}
      manualSorting={!isJobScope}
      maxHeightClassName={maxHeightClassName}
      columnVisibility={columnVisibility}
      columns={columns}
      data={candidates}
      enableRowSelection={Boolean(onRowSelectionChange && maxSelectedRows)}
      getRowId={getCandidateRowId}
      hasNextPage={hasNextPage}
      loadingMore={loadingMore}
      maxSelectedRows={maxSelectedRows}
      onColumnVisibilityChange={setColumnVisibility}
      onLoadMore={onLoadMore}
      onRowClick={onCandidateClick ? handleCandidateClick : undefined}
      onRowSelectionChange={onRowSelectionChange}
      onSortingChange={sortingChangeHandler}
      rowEstimatePx={CANDIDATE_ROW_ESTIMATE_PX}
      rowSelection={rowSelection}
      sorting={sorting}
    />
  );
}

function getCandidateSortingState(sorting: PipelineCandidateSorting): SortingState {
  return [{ id: sorting.sort, desc: sorting.direction === 'desc' }];
}

function getJobDefaultSorting(variant: CandidateTableVariant): SortingState {
  if (variant === 'review') {
    return [{ id: 'deadline', desc: false }];
  }

  return [{ id: 'applied', desc: true }];
}
