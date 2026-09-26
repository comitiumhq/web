import type { JobDraftListItem, OrgJobListItem } from '@comitium/schemas/jobs';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { DataTableVirtual } from '@comitium/ui/data-table-virtual';
import { useMediaQuery } from '@comitium/ui/use-media-query';
import { useNavigate } from '@tanstack/react-router';
import type { Row, SortingState } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useArchiveJob, useRestoreJob } from '@/hooks/mutations/use-job-archive-mutations';

import { getJobsColumns, type JobsRow } from './jobs-columns';
import { JobsMobileList } from './jobs-mobile-list';
import { JobsTableSkeleton } from './jobs-table-skeleton';

const GRID_MIN_WIDTH = '85rem';

interface JobsTableProps {
  orgId: string;
  rows: JobsRow[];
  loading: boolean;
  emptyState: ReactNode;
}

function getJobsRowId(row: JobsRow): string {
  return `${row.kind}-${row.id}`;
}

export function JobsTable({ orgId, rows, loading, emptyState }: JobsTableProps) {
  const navigate = useNavigate();
  const archiveJob = useArchiveJob();
  const restoreJob = useRestoreJob();
  const [jobToArchive, setJobToArchive] = useState<JobDraftListItem | OrgJobListItem | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const isMobile = useMediaQuery('(max-width: 639px)');
  const handleRestore = useCallback(
    (job: OrgJobListItem) => restoreJob.mutate({ orgId, jobId: job.id }),
    [orgId, restoreJob],
  );
  const columns = useMemo(
    () => getJobsColumns({ orgId, onRequestArchive: setJobToArchive, onRequestRestore: handleRestore }),
    [handleRestore, orgId],
  );

  const navigateToRow = useCallback(
    (item: JobsRow) => {
      if (item.kind === 'job' && item.job.archivedAt === null) {
        navigate({
          to: '/org/$orgId/jobs/$jobId/pipeline',
          params: { orgId, jobId: item.id },
          search: { tab: 'active' },
        });
        return;
      }

      navigate({ to: '/org/$orgId/jobs/$jobId/settings', params: { orgId, jobId: item.id } });
    },
    [navigate, orgId],
  );

  const handleRowClick = useCallback((row: Row<JobsRow>) => navigateToRow(row.original), [navigateToRow]);

  const handleArchiveDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setJobToArchive(null);
    }
  }, []);

  const handleConfirmArchive = useCallback(() => {
    if (!jobToArchive) {
      return;
    }

    archiveJob.mutate({ orgId, jobId: jobToArchive.id });
    setJobToArchive(null);
  }, [archiveJob, jobToArchive, orgId]);

  let tableContent: ReactNode;

  if (isMobile) {
    tableContent = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <JobsMobileList
          orgId={orgId}
          rows={rows}
          loading={loading}
          emptyState={emptyState}
          onRowClick={navigateToRow}
          onRequestArchive={setJobToArchive}
          onRequestRestore={handleRestore}
        />
      </div>
    );
  } else if (loading && rows.length === 0) {
    tableContent = <JobsTableSkeleton columns={columns} gridMinWidth={GRID_MIN_WIDTH} />;
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
        gridMinWidth={GRID_MIN_WIDTH}
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
        open={jobToArchive !== null}
        onOpenChange={handleArchiveDialogChange}
        title="Archive job"
        description={
          <>
            Archive <span className="font-medium">&ldquo;{jobToArchive?.title}&rdquo;</span>? Its candidates and
            Pipeline history will be preserved.
          </>
        }
        actionLabel="Archive"
        pendingLabel="Archiving..."
        onConfirm={handleConfirmArchive}
        isPending={archiveJob.isPending}
      />
    </div>
  );
}
