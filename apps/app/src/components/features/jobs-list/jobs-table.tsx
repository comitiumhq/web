import type { JobDraftListItem } from '@comitium/schemas/jobs';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { DataTableVirtual } from '@comitium/ui/data-table-virtual';
import { useMediaQuery } from '@comitium/ui/use-media-query';
import { useNavigate } from '@tanstack/react-router';
import type { Row, SortingState } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useDeleteDraft } from '@/hooks/mutations/use-delete-draft';

import { getJobsColumns, type JobsRow } from './jobs-columns';
import { JobsMobileList } from './jobs-mobile-list';
import { JobsTableSkeleton } from './jobs-table-skeleton';

const ADMIN_GRID_MIN_WIDTH = '93rem';
const MEMBER_GRID_MIN_WIDTH = '85rem';

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

  const isMobile = useMediaQuery('(max-width: 639px)');
  const gridMinWidth = isAdmin ? ADMIN_GRID_MIN_WIDTH : MEMBER_GRID_MIN_WIDTH;

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

  let tableContent: ReactNode;

  if (isMobile) {
    tableContent = (
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
    );
  } else if (loading && rows.length === 0) {
    tableContent = <JobsTableSkeleton columns={columns} gridMinWidth={gridMinWidth} />;
  } else {
    tableContent = (
      <DataTableVirtual
        ariaLabel="Jobs"
        size="sm"
        className={rows.length === 0 && !loading ? 'min-h-0 border-0 bg-transparent' : 'min-h-0'}
        maxHeightClassName="max-h-full"
        columns={columns}
        data={rows}
        emptyState={emptyState}
        getRowId={getJobsRowId}
        gridMinWidth={gridMinWidth}
        loadingMore={loading}
        loadingMoreRowCount={rows.length === 0 ? 8 : 3}
        onRowClick={handleRowClick}
        onSortingChange={setSorting}
        sorting={sorting}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tableContent}

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
