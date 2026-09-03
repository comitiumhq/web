import { Card, CardContent } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';

export function BalanceHistorySkeleton() {
  return (
    <Card size="sm" className="ring-inset">
      <CardContent>
        <div className="flex min-h-52 flex-col items-center justify-center py-12">
          <Skeleton className="mb-4 size-10 rounded-full" />
          <Skeleton className="mb-2 h-6 w-44" />
          <Skeleton className="h-5 w-56 max-w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
