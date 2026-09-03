import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import { EyeSlashIcon } from '@phosphor-icons/react';

export function LoadingState() {
  return (
    <div aria-busy>
      <span className="sr-only">Loading feedback</span>
      <Card aria-hidden size="sm" className="gap-0 py-0">
        <header className="border-b border-border px-4 py-2.5">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="mt-2 h-3 w-44 rounded-md" />
        </header>

        <div className="divide-y divide-border">
          <FeedbackRowSkeleton withAction />
          <FeedbackRowSkeleton />
        </div>
      </Card>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
      <p className="text-xs text-muted-foreground">Feedback could not be loaded.</p>
      <Button type="button" variant="outline" size="xs" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function FeedbackRowSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <Skeleton className="size-6 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-28 rounded-md" />
        <Skeleton className="mt-2 h-3 w-40 max-w-full rounded-md" />
      </div>
      <Skeleton className={withAction ? 'h-7 w-28 shrink-0 rounded-lg' : 'h-5 w-16 shrink-0 rounded-full'} />
    </div>
  );
}

export function Empty() {
  return <p className="text-xs text-muted-foreground text-center py-8">No feedback yet</p>;
}

export function GatedEmpty() {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-8 px-4 text-muted-foreground">
      <EyeSlashIcon className="size-5" />
      <p className="text-xs">Submit your own feedback to view other reviewers&apos; input.</p>
    </div>
  );
}
