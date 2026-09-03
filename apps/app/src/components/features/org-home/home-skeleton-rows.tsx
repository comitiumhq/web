import { Skeleton } from '@comitium/ui/skeleton';
import { cn } from '@/lib/utils';

const ROW_PATTERNS = [
  { title: 'w-44', sub: 'w-24' },
  { title: 'w-36', sub: 'w-28' },
  { title: 'w-40', sub: 'w-20' },
];

interface HomeSkeletonRowsProps {
  count: number;
}

export function HomeSkeletonRows({ count }: HomeSkeletonRowsProps) {
  const rows = Array.from({ length: count }, (_, index) => ROW_PATTERNS[index % ROW_PATTERNS.length]);

  return (
    <div>
      {rows.map((row, index) => (
        <div
          key={row.title + index}
          className={cn(
            'grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3',
            index < rows.length - 1 &&
              'relative after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px after:bg-border',
          )}
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className={cn('h-3.5 rounded-md', row.title)} />
            <Skeleton className={cn('h-3 rounded-md', row.sub)} />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}
