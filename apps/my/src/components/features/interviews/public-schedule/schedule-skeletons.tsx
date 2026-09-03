import { Skeleton } from '@comitium/ui/skeleton';

export function ScheduleSummarySkeleton() {
  return (
    <aside className="flex min-w-0 flex-col gap-6 p-5 sm:p-6 md:row-span-2 md:min-h-[540px] md:border-r md:border-border/70 xl:row-span-1">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-36" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-40" />
      </div>

      <div className="space-y-3 border-t border-border/70 pt-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-5 w-44" />
      </div>
    </aside>
  );
}

export function ScheduleCalendarSkeleton() {
  return (
    <div className="mx-auto w-fit max-w-full">
      <Skeleton className="h-5 w-28" />
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={`weekday-${index}`} className="h-5 w-10 rounded-md sm:w-12" />
        ))}
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton key={`day-${index}`} className="aspect-square w-10 rounded-xl sm:w-12 lg:w-14 xl:w-16" />
        ))}
      </div>
    </div>
  );
}

export function ScheduleSlotsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  );
}
