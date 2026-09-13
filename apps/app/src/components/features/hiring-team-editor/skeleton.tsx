import { Skeleton } from '@comitium/ui/skeleton';

const MEMBER_SKELETONS = [
  { key: 'member-1', nameWidth: 'w-28', metaWidth: 'w-44' },
  { key: 'member-2', nameWidth: 'w-36', metaWidth: 'w-36' },
  { key: 'member-3', nameWidth: 'w-24', metaWidth: 'w-40' },
];

interface HiringTeamSkeletonProps {
  showComposer?: boolean;
}

export function HiringTeamSkeleton({ showComposer = true }: HiringTeamSkeletonProps) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      {showComposer ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl sm:w-44" />
            <Skeleton className="h-9 w-full rounded-xl sm:w-20" />
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-card bg-clip-padding">
        {MEMBER_SKELETONS.map((member, index) => (
          <div
            key={member.key}
            className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-separator' : ''}`}
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className={`h-3.5 ${member.nameWidth} max-w-full rounded-md`} />
              <Skeleton className={`h-3 ${member.metaWidth} max-w-full rounded-md`} />
            </div>
            <Skeleton className="hidden h-8 w-36 rounded-xl sm:block" />
            <Skeleton className="size-8 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
