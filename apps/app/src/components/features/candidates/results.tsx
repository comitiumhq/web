import { CandidateSearchCacheError } from '@comitium/crypto/candidate-search-cache';
import { CandidateSearchError } from '@comitium/crypto/candidate-search-protocol';
import type { CandidateSearchDefinition, CandidateSearchListRow } from '@comitium/schemas/candidate-search';
import { Button } from '@comitium/ui/button';
import { DataTableVirtual } from '@comitium/ui/data-table-virtual';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { useMemo, useState } from 'react';
import { useQueryCandidateDirectory } from '@/hooks/queries/use-query-candidate-directory';
import { getErrorStatus } from '@/lib/api/client';
import { type CandidateDirectoryRow, CandidateSearchChanged } from '@/lib/candidates/search/candidate-query';

import { useCandidateColumns } from './candidate-columns';

const PROFILE_PRELOAD_ROWS = 50;

interface CandidateResultsProps {
  orgId: string;
  definition: CandidateSearchDefinition;
  requestId: string;
  restart: () => void;
  clearPrivate: () => void;
  onSelect: (row: CandidateSearchListRow) => void;
}

export function CandidateResults({
  orgId,
  definition,
  requestId,
  restart,
  clearPrivate,
  onSelect,
}: CandidateResultsProps) {
  const query = useQueryCandidateDirectory(orgId, definition, requestId);
  const rows = query.rows;
  const page = query.data?.pages.at(-1);
  const [visibleRows, setVisibleRows] = useState<CandidateDirectoryRow[]>([]);
  const firstVisibleId = visibleRows[0]?.candidateId;
  const firstVisible = Math.max(
    0,
    rows.findIndex((row) => row.candidateId === firstVisibleId),
  );
  const preloadStart = Math.max(0, firstVisible - PROFILE_PRELOAD_ROWS);
  const preloadEnd = Math.min(rows.length, firstVisible + visibleRows.length + PROFILE_PRELOAD_ROWS);
  const profileRows = useMemo(() => rows.slice(preloadStart, preloadEnd), [rows, preloadStart, preloadEnd]);
  const columns = useCandidateColumns(orgId, profileRows);
  const atEnd = visibleRows.at(-1)?.candidateId === rows.at(-1)?.candidateId;

  if (query.preparationError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-16">
        <p>{candidatePreparationMessage(query.preparationError)}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void query.retryPreparation().catch(() => undefined);
            }}
          >
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={clearPrivate}>
            Remove name and location filters
          </Button>
        </div>
      </div>
    );
  }

  const restartRequired =
    query.error instanceof CandidateSearchChanged || [401, 403, 409, 410].includes(getErrorStatus(query.error) ?? 0);

  if (query.isError && (!query.isFetchNextPageError || restartRequired)) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-16">
        <p>
          {query.error instanceof CandidateSearchError && query.error.code === 'INVALID_SEARCH'
            ? 'Use fewer search terms.'
            : 'Could not load these results.'}
        </p>
        <Button variant="outline" size="sm" onClick={restart}>
          Refresh results
        </Button>
      </div>
    );
  }

  const loading = query.isPending || query.preparing;

  let emptyLabel = 'No candidates yet.';

  if (definition.candidateAll.length || definition.applicationAny) {
    emptyLabel = 'No candidates match these filters.';
  }

  if (page?.approximate || page?.incomplete || page?.unreadable) {
    emptyLabel = 'No matching results found so far.';
  }

  if (page?.scanning) {
    emptyLabel = 'Searching candidates…';
  }

  return (
    <>
      <DataTableVirtual
        key={requestId}
        ariaLabel="Candidates"
        aria-busy={loading || query.isFetchingNextPage}
        className="min-h-0 flex-1"
        maxHeightClassName="max-h-full"
        columns={columns}
        data={rows}
        getRowId={(row) => row.candidateId}
        enableRowSelection={false}
        gridMinWidth="56rem"
        rowEstimatePx={64}
        hasNextPage={query.hasNextPage && !query.isFetchNextPageError}
        loadingMore={loading || query.isFetchingNextPage}
        loadingMoreRowCount={loading ? 10 : 3}
        onLoadMore={query.next}
        onVisibleRowsChange={setVisibleRows}
        onRowClick={({ original }) => onSelect(original)}
        emptyState={<p className="py-12 text-center text-sm text-muted-foreground">{emptyLabel}</p>}
      />
      {!loading && (rows.length === 0 || (page?.scanning && atEnd) || query.isFetchNextPageError) && (
        <InfiniteCollectionStatus
          hasNextPage={query.hasNextPage && atEnd}
          isFetchingNextPage={query.isFetchingNextPage}
          isFetchNextPageError={query.isFetchNextPageError}
          loadingLabel="Searching candidates…"
          errorLabel="Could not load more candidates."
          onLoadMore={query.next}
        />
      )}
    </>
  );
}

function candidatePreparationMessage(error: unknown): string {
  if (error instanceof CandidateSearchCacheError) {
    switch (error.code) {
      case 'blocked':
        return 'Close other Comitium tabs, then retry search.';
      case 'unsupported':
        return 'Update or reload Comitium to use search.';
      case 'capacity':
        return 'This candidate database exceeds this device’s search capacity.';
      case 'quota':
        return 'There is not enough browser storage to prepare search.';
    }
  }

  return 'Search is unavailable on this device.';
}
