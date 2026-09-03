import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { CardAction, CardContent, CardTitle } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import { BriefcaseIcon, CaretRightIcon, UsersIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import type { PipelineJob } from '@/lib/schemas/pipeline';
import { cn, formatLocation } from '@/lib/utils';

import { HomeCard, HomeCardHeader } from './home-card';
import { HomeEmptyState } from './home-empty-state';
import { HomeList, homeListRowClassName } from './home-list';
import { HomeSkeletonRows } from './home-skeleton-rows';

interface JobsCardProps {
  className?: string;
  isLoading: boolean;
  jobs: readonly PipelineJob[];
  orgId: string;
  totalCount: number | null;
}

interface JobRowProps {
  job: PipelineJob;
  orgId: string;
}

export function JobsCard({ className, isLoading, jobs, orgId, totalCount }: JobsCardProps) {
  const count = totalCount ?? jobs.length;
  const rows = jobs.map((job) => <JobRow key={job.id} job={job} orgId={orgId} />);

  return (
    <HomeCard className={className}>
      <HomeCardHeader>
        <CardTitle className="flex items-center gap-2">
          Jobs
          {isLoading ? <Skeleton className="h-5 w-10 rounded-4xl" /> : <Badge variant="secondary">{count}</Badge>}
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon-xs" aria-label="Open jobs" asChild>
            <Link to="/org/$orgId/jobs" params={{ orgId }} search={{ status: 'all' }}>
              <CaretRightIcon className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </HomeCardHeader>
      <CardContent className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {isLoading && <HomeSkeletonRows count={7} />}

        {!isLoading && jobs.length > 0 && <HomeList>{rows}</HomeList>}

        {!isLoading && jobs.length === 0 && (
          <HomeEmptyState icon={BriefcaseIcon} title="No jobs yet" description="Open jobs will appear here." />
        )}
      </CardContent>
    </HomeCard>
  );
}

const JobRow = memo(function JobRow({ job, orgId }: JobRowProps) {
  const title = job.title ?? `Job #${job.jobId}`;
  const location = formatLocation(job.location);

  return (
    <Link
      to="/org/$orgId/jobs/$jobId/pipeline"
      params={{ orgId, jobId: job.id }}
      search={{ tab: 'active' }}
      className={cn(homeListRowClassName, 'grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]')}
    >
      <span className="min-w-0">
        <span className="block truncate text-label-14">{title}</span>
        {location && <span className="block truncate text-copy-14 text-muted-foreground">{location}</span>}
      </span>
      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="inline-flex items-center gap-1 text-label-14 text-muted-foreground tabular-nums">
          <UsersIcon className="size-4 shrink-0" />
          {job.totalCandidates}
        </span>
      </span>
    </Link>
  );
});
