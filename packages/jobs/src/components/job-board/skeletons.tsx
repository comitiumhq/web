import { Card } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import { Skeleton } from '@comitium/ui/skeleton';

const LIST_SKELETON_WIDTHS = ['w-[82%]', 'w-[68%]', 'w-[74%]', 'w-[60%]', 'w-[78%]'] as const;
const JOB_LIST_ROW_MIN_HEIGHT_CLASS = 'min-h-[9.25rem]';

export type JobListSkeletonWidthClassName = (typeof LIST_SKELETON_WIDTHS)[number];

export function getJobListSkeletonWidthClassName(index: number): JobListSkeletonWidthClassName {
  return LIST_SKELETON_WIDTHS[index % LIST_SKELETON_WIDTHS.length];
}

interface JobListSkeletonItemProps {
  widthClassName: JobListSkeletonWidthClassName;
  isLast?: boolean;
}

export function JobListSkeletonItem({ widthClassName, isLast }: JobListSkeletonItemProps) {
  return (
    <div className={cn('border-b border-border px-4 py-4', JOB_LIST_ROW_MIN_HEIGHT_CLASS, { 'border-b-0': isLast })}>
      <div className="flex items-start gap-3">
        <Skeleton className="mt-0.5 size-9 shrink-0 rounded-lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1 pt-0.5">
              <Skeleton className={cn('h-6', widthClassName)} />
            </div>
            <Skeleton className="mt-1 h-3.5 w-20 shrink-0" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-20 rounded-4xl" />
            <Skeleton className="h-6 w-24 rounded-4xl" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-28 rounded-4xl" />
            <Skeleton className="h-6 w-24 rounded-4xl" />
            <Skeleton className="h-6 w-24 rounded-4xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card className="min-h-[var(--job-board-detail-height)] gap-0 overflow-hidden py-0">
      <JobListSkeletonRows count={count} />
    </Card>
  );
}

function JobListSkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <JobListSkeletonItem
          key={`job-list-skeleton-row-${index}`}
          widthClassName={getJobListSkeletonWidthClassName(index)}
          isLast={index === count - 1}
        />
      ))}
    </>
  );
}

export function JobDetailSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-5 py-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-8 w-[72%] max-w-xl" />
            <Skeleton className="h-8 w-[42%] max-w-sm" />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-4xl" />
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2.5">
          <Skeleton className="size-10 rounded-md" />
          <Skeleton className="h-4 w-28" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-40 rounded-4xl" />
          <Skeleton className="h-6 w-24 rounded-4xl" />
          <Skeleton className="h-6 w-24 rounded-4xl" />
          <Skeleton className="h-6 w-28 rounded-4xl" />
          <Skeleton className="h-6 w-28 rounded-4xl" />
          <Skeleton className="h-6 w-32 rounded-4xl" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-hidden px-5 py-5">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-32" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[94%]" />
            <Skeleton className="h-4 w-[86%]" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[88%]" />
            <Skeleton className="h-4 w-[76%]" />
            <Skeleton className="h-4 w-[82%]" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-28" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-[84%]" />
            <Skeleton className="h-4 w-[72%]" />
          </div>
        </div>
      </div>
    </div>
  );
}
