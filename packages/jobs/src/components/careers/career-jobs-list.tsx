import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import { EmptyState } from '@comitium/ui/empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { BriefcaseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import type { CareerJobListItem } from '../../schemas/careers';
import { CareerJobRow } from './career-job-row';

const SKELETON_WIDTHS = ['w-[78%]', 'w-[64%]', 'w-[72%]', 'w-[58%]', 'w-[82%]'] as const;
const departmentCountChipClassName =
  'inline-flex h-6 min-w-7 items-center justify-center rounded-4xl bg-muted px-2 text-label-12 text-muted-foreground tabular-nums';

type SkeletonWidthClassName = (typeof SKELETON_WIDTHS)[number];

interface CareerJobsListProps {
  jobs: CareerJobListItem[];
  loading?: boolean;
  error?: boolean;
  hasActiveFilters?: boolean;
  loadingSkeletonCount: number;
  onClearFilters: () => void;
}

interface CareerJobsStatusPanelProps {
  type: 'empty' | 'error';
  hasActiveFilters?: boolean;
  onClearFilters: () => void;
}

interface CareerJobSkeletonRowProps {
  widthClassName: SkeletonWidthClassName;
  isLast?: boolean;
}

interface CareerJobGroup {
  key: string;
  label: string;
  sortOrder: number;
  jobs: CareerJobListItem[];
}

function getSkeletonWidthClassName(index: number): SkeletonWidthClassName {
  return SKELETON_WIDTHS[index % SKELETON_WIDTHS.length];
}

function getDepartmentKey(job: CareerJobListItem) {
  return job.departmentId ?? job.departmentSlug ?? 'other';
}

function getDepartmentLabel(job: CareerJobListItem) {
  return job.departmentName ?? 'Other';
}

function compareJobsByTitle(left: CareerJobListItem, right: CareerJobListItem) {
  return (left.title ?? '').localeCompare(right.title ?? '', undefined, { sensitivity: 'base' });
}

function groupJobsByDepartment(jobs: CareerJobListItem[]): CareerJobGroup[] {
  const groupsByDepartment = jobs.reduce((groups, job) => {
    const key = getDepartmentKey(job);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.jobs.push(job);

      return groups;
    }

    groups.set(key, {
      key,
      label: getDepartmentLabel(job),
      sortOrder: job.departmentSortOrder ?? Number.MAX_SAFE_INTEGER,
      jobs: [job],
    });

    return groups;
  }, new Map<string, CareerJobGroup>());

  return Array.from(groupsByDepartment.values())
    .map((group) => ({ ...group, jobs: [...group.jobs].sort(compareJobsByTitle) }))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
    });
}

function CareerJobsStatusPanel({ type, hasActiveFilters = false, onClearFilters }: CareerJobsStatusPanelProps) {
  if (type === 'error') {
    return (
      <Card className="gap-0 py-0">
        <EmptyState
          icon={WarningCircleIcon}
          title="Roles failed to load"
          description="Refresh the page or try again in a moment."
          className="min-h-72"
        />
      </Card>
    );
  }

  const title = hasActiveFilters ? 'No matching roles' : 'No open roles yet';
  const description = hasActiveFilters
    ? 'Try different filters or clear the selected filters.'
    : 'Open roles will appear here as soon as this team publishes them.';

  return (
    <Card className="gap-0 py-0">
      <EmptyState icon={BriefcaseIcon} title={title} description={description} className="min-h-72">
        {hasActiveFilters && (
          <Button variant="outline" className="mt-4" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </EmptyState>
    </Card>
  );
}

function CareerJobSkeletonRow({ widthClassName, isLast }: CareerJobSkeletonRowProps) {
  return (
    <div className={cn('min-h-30 border-b border-border px-4 py-4 sm:px-5', { 'border-b-0': isLast })}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <Skeleton className={cn('h-6', widthClassName)} />
            <Skeleton className="mt-1 h-3.5 w-20 shrink-0" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-4xl" />
            <Skeleton className="h-6 w-28 rounded-4xl" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-28 rounded-4xl" />
          </div>
        </div>

        <Skeleton className="mt-1 size-4 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function CareerJobsSkeleton({ count }: { count: number }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      {Array.from({ length: count }).map((_, index) => (
        <CareerJobSkeletonRow
          key={`career-job-skeleton-${index}`}
          widthClassName={getSkeletonWidthClassName(index)}
          isLast={index === count - 1}
        />
      ))}
    </Card>
  );
}

export function CareerJobsList({
  jobs,
  loading,
  error,
  hasActiveFilters,
  loadingSkeletonCount,
  onClearFilters,
}: CareerJobsListProps) {
  const groupedJobs = useMemo(() => groupJobsByDepartment(jobs), [jobs]);

  if (loading) {
    return <CareerJobsSkeleton count={loadingSkeletonCount} />;
  }

  if (error) {
    return <CareerJobsStatusPanel type="error" onClearFilters={onClearFilters} />;
  }

  if (jobs.length === 0) {
    return <CareerJobsStatusPanel type="empty" hasActiveFilters={hasActiveFilters} onClearFilters={onClearFilters} />;
  }

  return (
    <div className="space-y-8">
      {groupedJobs.map((group) => (
        <section key={group.key}>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-heading-20">{group.label}</h3>
            <span className={departmentCountChipClassName}>{group.jobs.length}</span>
          </div>
          <Card className="gap-0 overflow-hidden py-0">
            {group.jobs.map((job, index) => (
              <CareerJobRow key={job.postingId} job={job} isLast={index === group.jobs.length - 1} />
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
