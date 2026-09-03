import type { JobDraftListItem } from '@comitium/schemas/jobs';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { DataTableVirtual } from '@comitium/ui/data-table-virtual';
import { useMediaQuery } from '@comitium/ui/use-media-query';
import { useNavigate } from '@tanstack/react-router';
import type { Row, SortingState, VisibilityState } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeleteDraft } from '@/hooks/mutations/use-delete-draft';

import { getJobsColumns, type JobsRow } from './jobs-columns';
import { JobsMobileList } from './jobs-mobile-list';

interface JobsTableProps {
  orgId: string;
  rows: JobsRow[];
  isAdmin: boolean;
  loading: boolean;
  emptyState: ReactNode;
}

function getJobsRowId(row: JobsRow): string {
  return `${row.kind}-${row.id}`;
}

export function JobsTable({ orgId, rows, isAdmin, loading, emptyState }: JobsTableProps) {
  const navigate = useNavigate();
  const { mutate: deleteDraftMutate, isPending: isDeleting } = useDeleteDraft(orgId);
  const [draftToDelete, setDraftToDelete] = useState<JobDraftListItem | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const hideCreated = useMediaQuery('(max-width: 1279px)');
  const hideStake = useMediaQuery('(max-width: 1099px)');
  const hideTeam = useMediaQuery('(max-width: 959px)');
  const isMobile = useMediaQuery('(max-width: 639px)');

  const defaultVisibility = useMemo<VisibilityState>(
    () => ({ created: !hideCreated, stake: !hideStake, team: !hideTeam }),
    [hideCreated, hideStake, hideTeam],
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultVisibility);

  useEffect(() => {
    setColumnVisibility(defaultVisibility);
  }, [defaultVisibility]);

  const gridMinWidth = useMemo(() => {
    if (hideTeam) {
      return '560px';
    }

    if (hideStake) {
      return '660px';
    }

    if (hideCreated) {
      return '760px';
    }

    return '880px';
  }, [hideCreated, hideStake, hideTeam]);

  const columns = useMemo(
    () => getJobsColumns({ orgId, isAdmin, onRequestDelete: setDraftToDelete }),
    [orgId, isAdmin],
  );

  const navigateToRow = useCallback(
    (item: JobsRow) => {
      if (item.kind === 'job') {
        navigate({
          to: '/org/$orgId/jobs/$jobId/pipeline',
          params: { orgId, jobId: item.id },
          search: { tab: 'active' },
        });
        return;
      }

      navigate({ to: '/org/$orgId/jobs/$jobId/details', params: { orgId, jobId: item.id } });
    },
    [navigate, orgId],
  );

  const handleRowClick = useCallback((row: Row<JobsRow>) => navigateToRow(row.original), [navigateToRow]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setDraftToDelete(null);
    }
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!draftToDelete) {
      return;
    }

    deleteDraftMutate(draftToDelete.id);
    setDraftToDelete(null);
  }, [draftToDelete, deleteDraftMutate]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <JobsMobileList
            orgId={orgId}
            rows={rows}
            isAdmin={isAdmin}
            loading={loading}
            emptyState={emptyState}
            onRowClick={navigateToRow}
            onRequestDelete={setDraftToDelete}
          />
        </div>
      ) : (
        <DataTableVirtual
          ariaLabel="Jobs"
          size="sm"
          className={rows.length === 0 && !loading ? 'min-h-0 border-0 bg-transparent' : 'min-h-0'}
          maxHeightClassName="max-h-full"
          columns={columns}
          columnVisibility={columnVisibility}
          data={rows}
          emptyState={emptyState}
          getRowId={getJobsRowId}
          gridMinWidth={gridMinWidth}
          loadingMore={loading}
          loadingMoreRowCount={rows.length === 0 ? 8 : 3}
          onColumnVisibilityChange={setColumnVisibility}
          onRowClick={handleRowClick}
          onSortingChange={setSorting}
          sorting={sorting}
        />
      )}

      <ConfirmDialog
        open={draftToDelete !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete draft"
        description={
          <>
            Permanently delete <span className="font-medium">&ldquo;{draftToDelete?.title}&rdquo;</span>? This cannot be
            undone.
          </>
        }
        actionLabel="Delete"
        pendingLabel="Deleting..."
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />
    </div>
  );
}
