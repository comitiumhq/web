import type { JobDraftListItem, OrgJobListItem } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { formatCompactDate, formatRelativeTime } from '@comitium/ui/date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { Skeleton } from '@comitium/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { ArrowRightIcon, CopyIcon, DotsThreeIcon, TrashIcon } from '@phosphor-icons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { memo, useCallback } from 'react';
import { JobStatusBadge } from '@/components/features/job-detail/job-status-badge';
import { useCreateDraft } from '@/hooks/mutations/use-create-draft';
import { usePermissions } from '@/hooks/use-permissions';
import { formatEmployerStake } from '@/lib/jobs';
import { isJobPublishing } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';
import { formatLocation } from '@/lib/utils';

import { HiringTeamAvatars } from './hiring-team-avatars';

export type JobsRow =
  | { kind: 'job'; id: string; job: OrgJobListItem }
  | { kind: 'draft'; id: string; draft: JobDraftListItem };

interface JobsColumnsContext {
  orgId: string;
  isAdmin: boolean;
  onRequestDelete: (draft: JobDraftListItem) => void;
}

export function metaLine(departmentName: string | null, location: OrgJobListItem['location']): string {
  return [departmentName, formatLocation(location)].filter(Boolean).join(' · ');
}

interface ActionsCellProps {
  orgId: string;
  row: JobsRow;
  onRequestDelete: (draft: JobDraftListItem) => void;
}

export const ActionsCell = memo(function ActionsCell({ orgId, row, onRequestDelete }: ActionsCellProps) {
  const { can } = usePermissions();
  const { mutate: createDraft, isPending: isDuplicating } = useCreateDraft(orgId, { navigateOnSuccess: false });
  const canCreate = can(Permission.JOB_CREATE);
  const canDeleteDraft = row.kind === 'draft' && !isJobPublishing(row.draft.lifecycle) && can(Permission.JOB_EDIT);

  const sourceId = row.id;

  const handleDuplicate = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      createDraft({ sourceJobId: sourceId });
    },
    [createDraft, sourceId],
  );

  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      if (row.kind === 'draft') {
        onRequestDelete(row.draft);
      }
    },
    [onRequestDelete, row],
  );

  const handleStopPropagation = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  if (!canCreate && !canDeleteDraft) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isDuplicating}
          aria-label="Job actions"
          onClick={handleStopPropagation}
        >
          <DotsThreeIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canCreate && (
          <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
            <CopyIcon />
            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
          </DropdownMenuItem>
        )}
        {canDeleteDraft && (
          <>
            {canCreate && <DropdownMenuSeparator />}
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <TrashIcon />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export function getJobsColumns({ orgId, isAdmin, onRequestDelete }: JobsColumnsContext): ColumnDef<JobsRow>[] {
  const jobColumn: ColumnDef<JobsRow> = {
    id: 'job',
    header: 'Job',
    cell: ({ row }) => {
      const item = row.original;

      if (item.kind === 'draft') {
        const subtitle = isJobPublishing(item.draft.lifecycle) ? 'Publication submitted' : 'Finish setup';

        return (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">{item.draft.title || 'Untitled role'}</span>
            <span className="inline-flex items-center gap-1 text-label-12 text-muted-foreground">
              {subtitle}
              <ArrowRightIcon className="size-3 shrink-0" />
            </span>
          </div>
        );
      }

      const subtitle = metaLine(item.job.departmentName, item.job.location);

      return (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">
            {item.job.title ?? `Job #${item.job.jobId ?? ''}`}
          </span>
          {subtitle && <span className="truncate text-label-12 text-muted-foreground">{subtitle}</span>}
        </div>
      );
    },
    enableSorting: false,
    meta: {
      gridSize: 'minmax(240px,1fr)',
      headerClassName: 'pl-4',
      cellClassName: 'pl-4',
      label: 'Job',
      loadingCell: (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-48 max-w-full" />
          <Skeleton className="h-3 w-32 max-w-full" />
        </div>
      ),
      skeletonClassName: 'w-40',
    },
  };

  const candidatesColumn: ColumnDef<JobsRow> = {
    id: 'candidates',
    header: 'Candidates',
    accessorFn: (row) => (row.kind === 'job' ? row.job.candidateCount : -1),
    cell: ({ row }) => {
      const item = row.original;

      if (item.kind !== 'job') {
        return null;
      }

      return <span className="tabular-nums">{item.job.candidateCount}</span>;
    },
    enableSorting: true,
    meta: {
      gridSize: '150px',
      label: 'Candidates',
      skeletonClassName: 'w-8',
    },
  };

  const teamColumn: ColumnDef<JobsRow> = {
    id: 'team',
    header: 'Team',
    cell: ({ row }) => (row.original.kind === 'job' ? <HiringTeamAvatars team={row.original.job.hiringTeam} /> : null),
    enableSorting: false,
    meta: {
      gridSize: '116px',
      label: 'Team',
      loadingCell: (
        <div className="flex items-center [&>*+*]:-ml-1.5">
          <Skeleton className="size-7 rounded-full ring-2 ring-card" />
          <Skeleton className="size-7 rounded-full ring-2 ring-card" />
        </div>
      ),
      skeletonClassName: 'w-16',
    },
  };

  const stakeColumn: ColumnDef<JobsRow> = {
    id: 'stake',
    header: 'Stake',
    accessorFn: (row) => (row.kind === 'job' ? Number(row.job.stake ?? 0) : 0),
    cell: ({ row }) => {
      const item = row.original;

      if (item.kind !== 'job' || !item.job.stake) {
        return null;
      }

      return <span className="font-medium tabular-nums">{formatEmployerStake(item.job.stake)}</span>;
    },
    enableSorting: true,
    meta: {
      gridSize: '104px',
      label: 'Stake',
      skeletonClassName: 'w-12',
    },
  };

  const statusColumn: ColumnDef<JobsRow> = {
    id: 'status',
    header: 'Status',
    cell: ({ row }) =>
      row.original.kind === 'job' ? (
        <JobStatusBadge status={row.original.job.status} />
      ) : (
        <JobStatusBadge status={row.original.draft.status} />
      ),
    enableSorting: false,
    meta: { gridSize: '104px', label: 'Status', skeletonClassName: 'h-5 w-16 rounded-full' },
  };

  const createdColumn: ColumnDef<JobsRow> = {
    id: 'created',
    header: 'Created',
    accessorFn: (row) => (row.kind === 'job' ? row.job.createdAt : row.draft.updatedAt),
    cell: ({ row }) => {
      const item = row.original;
      const iso = item.kind === 'job' ? item.job.createdAt : item.draft.updatedAt;
      const prefix = item.kind === 'draft' ? 'edited ' : '';

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate tabular-nums text-muted-foreground">{`${prefix}${formatCompactDate(iso)}`}</span>
          </TooltipTrigger>
          <TooltipContent>{formatRelativeTime(iso)}</TooltipContent>
        </Tooltip>
      );
    },
    enableSorting: true,
    meta: { gridSize: '120px', label: 'Created', skeletonClassName: 'w-12' },
  };

  const actionsColumn: ColumnDef<JobsRow> = {
    id: 'actions',
    header: '',
    cell: ({ row }) => <ActionsCell orgId={orgId} row={row.original} onRequestDelete={onRequestDelete} />,
    enableSorting: false,
    enableHiding: false,
    meta: { gridSize: '48px', label: 'Actions', skeletonClassName: 'ml-auto size-7 rounded-full' },
  };

  const columns: ColumnDef<JobsRow>[] = [jobColumn, candidatesColumn, teamColumn];

  if (isAdmin) {
    columns.push(stakeColumn);
  }

  columns.push(statusColumn, createdColumn, actionsColumn);

  return columns;
}
