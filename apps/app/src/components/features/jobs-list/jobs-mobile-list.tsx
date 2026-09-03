import type { JobDraftListItem, OrgJobListItem } from '@comitium/schemas/jobs';
import { Skeleton } from '@comitium/ui/skeleton';
import type { ReactNode } from 'react';
import { memo, useCallback } from 'react';
import { JobStatusBadge } from '@/components/features/job-detail/job-status-badge';
import { formatEmployerStake } from '@/lib/jobs';
import { isJobPublishing } from '@/lib/jobs/status';

import { ActionsCell, type JobsRow, metaLine } from './jobs-columns';

const SKELETON_ROWS = ['s1', 's2', 's3', 's4'];

interface JobsMobileListProps {
  orgId: string;
  rows: JobsRow[];
  isAdmin: boolean;
  loading: boolean;
  emptyState: ReactNode;
  onRowClick: (row: JobsRow) => void;
  onRequestDelete: (draft: JobDraftListItem) => void;
}

export function JobsMobileList({
  orgId,
  rows,
  isAdmin,
  loading,
  emptyState,
  onRowClick,
  onRequestDelete,
}: JobsMobileListProps) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {SKELETON_ROWS.map((key) => (
          <div key={key} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="flex min-h-full flex-col justify-center">{emptyState}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <JobMobileCard
          key={`${row.kind}-${row.id}`}
          orgId={orgId}
          row={row}
          isAdmin={isAdmin}
          onClick={onRowClick}
          onRequestDelete={onRequestDelete}
        />
      ))}
    </div>
  );
}

interface JobMobileCardProps {
  orgId: string;
  row: JobsRow;
  isAdmin: boolean;
  onClick: (row: JobsRow) => void;
  onRequestDelete: (draft: JobDraftListItem) => void;
}

const JobMobileCard = memo(function JobMobileCard({
  orgId,
  row,
  isAdmin,
  onClick,
  onRequestDelete,
}: JobMobileCardProps) {
  const handleClick = useCallback(() => {
    onClick(row);
  }, [onClick, row]);

  const isDraft = row.kind === 'draft';
  const title = isDraft ? row.draft.title || 'Untitled role' : (row.job.title ?? `Job #${row.job.jobId ?? ''}`);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3 pr-10 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{title}</span>
          {isDraft ? <JobStatusBadge status={row.draft.status} /> : <JobStatusBadge status={row.job.status} />}
        </span>

        {isDraft ? (
          <span className="text-label-12 text-primary">
            {isJobPublishing(row.draft.lifecycle) ? 'Publication submitted' : 'Finish setup →'}
          </span>
        ) : (
          <JobMobileMeta job={row.job} isAdmin={isAdmin} />
        )}
      </button>

      <span className="absolute right-2 top-2.5">
        <ActionsCell orgId={orgId} row={row} onRequestDelete={onRequestDelete} />
      </span>
    </div>
  );
});

const JobMobileMeta = memo(function JobMobileMeta({ job, isAdmin }: { job: OrgJobListItem; isAdmin: boolean }) {
  const subtitle = metaLine(job.departmentName, job.location);

  return (
    <>
      {subtitle && <span className="truncate text-label-12 text-muted-foreground">{subtitle}</span>}
      <span className="flex items-center gap-1.5 text-label-12 text-muted-foreground">
        <span className="tabular-nums">{job.candidateCount} candidates</span>
        {isAdmin && job.stake && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-medium tabular-nums text-foreground">{formatEmployerStake(job.stake)}</span>
          </>
        )}
      </span>
    </>
  );
});
