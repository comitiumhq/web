import { Skeleton } from '@comitium/ui/skeleton';

const STAGE_SKELETONS = [
  { key: 'stage-1', titleWidth: 'w-36', detailWidth: 'w-44' },
  { key: 'stage-2', titleWidth: 'w-32', detailWidth: 'w-36' },
  { key: 'stage-3', titleWidth: 'w-40', detailWidth: 'w-40' },
];

export function InterviewPlanSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-full max-w-md rounded-md" />
        </div>
        <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
      </div>

      {STAGE_SKELETONS.map((stage) => (
        <div key={stage.key} className="overflow-hidden rounded-2xl border border-border bg-card bg-clip-padding">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <Skeleton className={`h-4 ${stage.titleWidth} rounded-md`} />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-4 shrink-0 rounded-md" />
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <Skeleton className={`h-4 ${stage.detailWidth} rounded-md`} />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="size-7 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
