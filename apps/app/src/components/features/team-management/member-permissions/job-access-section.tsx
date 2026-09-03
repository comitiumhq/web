import { Button } from '@comitium/ui/button';
import { Skeleton } from '@comitium/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { ArrowUpRightIcon, BriefcaseIcon, InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import type { MemberDirectJobAssignment } from '@/lib/schemas/org-structure';

import { SectionCard } from './section-card';

interface JobAccessSectionProps {
  orgId: string;
  assignments: MemberDirectJobAssignment[];
  isOrgAdmin: boolean;
  isError: boolean;
  isLoading: boolean;
}

const SOURCE_LABELS: Record<Exclude<MemberDirectJobAssignment['source'], 'hiring_team'>, string> = {
  manual: 'Direct access',
  import: 'Imported access',
};

const ORG_ADMIN_HELP_TEXT =
  'Organization-wide access is already granted. Job assignments are shown for responsibilities and notifications.';
const MEMBER_HELP_TEXT = 'Hiring Team assignments are managed from each job.';

export const JobAccessSection = memo(function JobAccessSection({
  orgId,
  assignments,
  isOrgAdmin,
  isError,
  isLoading,
}: JobAccessSectionProps) {
  const helpText = getJobAccessHelpText(isOrgAdmin);

  return (
    <SectionCard title={<JobAccessTitle helpText={helpText} />}>
      <JobAccessContent orgId={orgId} assignments={assignments} isError={isError} isLoading={isLoading} />
    </SectionCard>
  );
});

interface JobAccessContentProps {
  orgId: string;
  assignments: MemberDirectJobAssignment[];
  isError: boolean;
  isLoading: boolean;
}

const JobAccessContent = memo(function JobAccessContent({
  orgId,
  assignments,
  isError,
  isLoading,
}: JobAccessContentProps) {
  if (isLoading) {
    return <JobAccessSkeleton />;
  }

  if (isError) {
    return <JobAccessError />;
  }

  if (assignments.length === 0) {
    return <JobAccessEmpty />;
  }

  return (
    <div className="divide-y divide-border">
      {assignments.map((assignment) => (
        <JobAccessRow key={assignment.id} orgId={orgId} assignment={assignment} />
      ))}
    </div>
  );
});

function JobAccessError() {
  return (
    <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-muted/50 px-4 py-5 text-center">
      <WarningCircleIcon className="size-4 text-muted-foreground" />
      <p className="text-label-14">Could not load job access</p>
    </div>
  );
}

function JobAccessEmpty() {
  return (
    <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-muted/50 px-4 py-5 text-center">
      <BriefcaseIcon className="size-4 text-muted-foreground" />
      <p className="text-label-14">No job-specific assignments</p>
    </div>
  );
}

function JobAccessSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

interface JobAccessTitleProps {
  helpText: string;
}

function JobAccessTitle({ helpText }: JobAccessTitleProps) {
  return (
    <span className="flex items-center gap-1.5">
      Job Access
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="About job access"
            className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            <InfoIcon className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{helpText}</TooltipContent>
      </Tooltip>
    </span>
  );
}

interface JobAccessRowProps {
  orgId: string;
  assignment: MemberDirectJobAssignment;
}

const JobAccessRow = memo(function JobAccessRow({ orgId, assignment }: JobAccessRowProps) {
  const title = getJobTitle(assignment.jobTitle);
  const sourceLabel = getSourceLabel(assignment.source);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
      <div className="min-w-0">
        <p className="text-label-14 truncate">{title}</p>
        {sourceLabel && <p className="text-copy-12 text-muted-foreground">{sourceLabel}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-label-12 max-w-32 truncate text-muted-foreground">{assignment.roleName}</span>
        <JobAccessLink orgId={orgId} assignment={assignment} title={title} />
      </div>
    </div>
  );
});

interface JobAccessLinkProps {
  orgId: string;
  assignment: MemberDirectJobAssignment;
  title: string;
}

function JobAccessLink({ orgId, assignment, title }: JobAccessLinkProps) {
  if (assignment.source === 'hiring_team') {
    return (
      <Button variant="ghost" size="icon-sm" asChild>
        <Link
          to="/org/$orgId/jobs/$jobId/hiring-team"
          params={{ orgId, jobId: assignment.jobId }}
          aria-label={`Open ${title} hiring team`}
        >
          <ArrowUpRightIcon />
        </Link>
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon-sm" asChild>
      <Link
        to="/org/$orgId/jobs/$jobId/details"
        params={{ orgId, jobId: assignment.jobId }}
        aria-label={`Open ${title}`}
      >
        <ArrowUpRightIcon />
      </Link>
    </Button>
  );
}

function getJobAccessHelpText(isOrgAdmin: boolean): string {
  if (isOrgAdmin) {
    return ORG_ADMIN_HELP_TEXT;
  }

  return MEMBER_HELP_TEXT;
}

function getSourceLabel(source: MemberDirectJobAssignment['source']): string | null {
  if (source === 'hiring_team') {
    return null;
  }

  return SOURCE_LABELS[source];
}

function getJobTitle(title: string | null): string {
  const trimmedTitle = title?.trim();

  return trimmedTitle || 'Untitled job';
}
