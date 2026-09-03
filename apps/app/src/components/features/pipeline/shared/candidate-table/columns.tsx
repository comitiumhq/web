import type { CandidateProfile } from '@comitium/schemas/candidates';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { parseISO } from 'date-fns';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';

import { CandidateIdentityCell, CriteriaCell, DateCell, JobCell, StageAgeCell } from './cells';
import { DeadlineCell, StatusCell } from './status-deadline';

export type CandidateTableVariant = 'review' | 'offer' | 'hired';
export type CandidateTableScope = 'global' | 'job';

interface ColumnContext {
  namesMap: Map<string, CandidateProfile>;
  orgId: string;
  showJob: boolean;
  timezone: string;
  scope: CandidateTableScope;
}

interface CandidateColumnOptions {
  compact?: boolean;
  showUrgencyStripe?: boolean;
}

function candidateColumn(
  namesMap: Map<string, CandidateProfile>,
  showJob: boolean,
  { compact = false, showUrgencyStripe = false }: CandidateColumnOptions = {},
): ColumnDef<PipelineCandidate> {
  return {
    id: 'candidate',
    header: 'Candidate',
    cell: ({ row }) => {
      const candidate = row.original;
      const profile = namesMap.get(candidate.candidateId ?? '') ?? null;

      return (
        <CandidateIdentityCell
          candidate={candidate}
          profile={profile}
          showJob={showJob}
          showUrgencyStripe={showUrgencyStripe}
        />
      );
    },
    enableHiding: false,
    meta: {
      gridSize: compact ? 'minmax(12rem,1.15fr)' : 'minmax(15rem,1.2fr)',
      headerClassName: 'pl-4',
      cellClassName: 'pl-4',
      label: 'Candidate',
      skeletonClassName: 'w-36',
    },
  };
}

function jobColumn(orgId: string, compact: boolean): ColumnDef<PipelineCandidate> {
  return {
    id: 'job',
    header: 'Job',
    cell: ({ row }) => <JobCell candidate={row.original} orgId={orgId} />,
    meta: {
      gridSize: compact ? 'minmax(12rem,1fr)' : 'minmax(16rem,1.1fr)',
      label: 'Job',
      skeletonClassName: 'w-52',
    },
  };
}

const criteriaColumn: ColumnDef<PipelineCandidate> = {
  id: 'criteria',
  header: 'Match criteria',
  accessorFn: (candidate) => candidate.criterionSummary?.metCount ?? 0,
  enableSorting: true,
  cell: ({ row }) => <CriteriaCell candidate={row.original} />,
  meta: {
    gridSize: 'minmax(6.5rem,0.55fr)',
    label: 'Match criteria',
    skeletonClassName: 'w-10',
  },
};

function appliedColumn(compact: boolean): ColumnDef<PipelineCandidate> {
  return {
    id: 'applied',
    header: 'Applied',
    accessorFn: (candidate) => candidate.appliedAt ?? '',
    enableSorting: true,
    cell: ({ row }) => <DateCell iso={row.original.appliedAt} />,
    meta: {
      gridSize: compact ? 'minmax(6rem,0.5fr)' : '8rem',
      label: 'Applied',
      skeletonClassName: 'w-16',
    },
  };
}

function stageAgeColumn(sortable: boolean): ColumnDef<PipelineCandidate> {
  return {
    id: 'inReview',
    header: 'In review',
    accessorFn: sortable ? (candidate) => candidate.currentStageEnteredAt ?? candidate.appliedAt : undefined,
    enableSorting: sortable,
    cell: ({ row }) => <StageAgeCell candidate={row.original} />,
    meta: {
      gridSize: 'minmax(6rem,0.5fr)',
      label: 'Time in review',
      skeletonClassName: 'w-10',
    },
  };
}

function dateColumn(
  id: string,
  header: string,
  getDate: (candidate: PipelineCandidate) => string | null,
): ColumnDef<PipelineCandidate> {
  return {
    id,
    header,
    accessorFn: (candidate) => getDate(candidate) ?? '',
    enableSorting: true,
    cell: ({ row }) => <DateCell iso={getDate(row.original)} />,
    meta: {
      gridSize: '8rem',
      label: header,
      skeletonClassName: 'w-16',
    },
  };
}

const statusColumn: ColumnDef<PipelineCandidate> = {
  id: 'status',
  header: 'Status',
  cell: ({ row }) => <StatusCell candidate={row.original} />,
  meta: {
    gridSize: 'minmax(10rem,0.85fr)',
    label: 'Status',
    skeletonClassName: 'w-28 rounded-4xl',
  },
};

function getDeadlineSortValue(candidate: PipelineCandidate): number {
  if (candidate.isResponded || candidate.responseDeadline === null) {
    return Number.POSITIVE_INFINITY;
  }

  return parseISO(candidate.responseDeadline).getTime();
}

function deadlineColumn(timezone: string, sortable: boolean): ColumnDef<PipelineCandidate> {
  return {
    id: 'deadline',
    header: 'Deadline',
    accessorFn: sortable ? getDeadlineSortValue : undefined,
    enableSorting: sortable,
    cell: ({ row }) => <DeadlineCell candidate={row.original} timezone={timezone} />,
    meta: {
      gridSize: 'minmax(7rem,0.65fr)',
      label: 'Deadline',
      skeletonClassName: 'w-24 rounded-4xl',
    },
  };
}

export function getCandidateColumns(
  variant: CandidateTableVariant,
  ctx: ColumnContext,
): ColumnDef<PipelineCandidate>[] {
  const isJobScope = ctx.scope === 'job';
  const isReview = variant === 'review';
  const candidateOptions = isReview ? { compact: true, showUrgencyStripe: true } : undefined;
  const lead = isJobScope
    ? [candidateColumn(ctx.namesMap, ctx.showJob, candidateOptions)]
    : [candidateColumn(ctx.namesMap, ctx.showJob, candidateOptions), jobColumn(ctx.orgId, isReview)];

  if (isReview) {
    return [
      ...lead,
      statusColumn,
      deadlineColumn(ctx.timezone, isJobScope),
      criteriaColumn,
      stageAgeColumn(!isJobScope),
      appliedColumn(true),
    ];
  }

  if (variant === 'offer') {
    return [...lead, appliedColumn(false), dateColumn('updated', 'Updated', (candidate) => candidate.updatedAt)];
  }

  return [...lead, appliedColumn(false), dateColumn('terminal', 'Hired', (candidate) => candidate.terminalOutcomeAt)];
}

export function getResponsiveColumnVisibility(
  variant: CandidateTableVariant,
  { isMobileTable, isTabletTable }: { isMobileTable: boolean; isTabletTable: boolean },
): VisibilityState {
  if (isMobileTable) {
    if (variant === 'review') {
      return { job: false, criteria: false, inReview: false, applied: false };
    }

    return { job: false, criteria: false, applied: false, updated: false, terminal: false };
  }

  if (isTabletTable) {
    if (variant === 'review') {
      return { job: false, criteria: false, applied: false };
    }

    return { job: false, criteria: false };
  }

  return {};
}
