import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageContainer } from '@comitium/ui/page-container';
import { Skeleton } from '@comitium/ui/skeleton';
import { FileXIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

export function DraftEditorSkeleton() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-separator bg-card lg:flex">
        <div className="shrink-0 border-b border-separator px-4 py-5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-40 mt-4" />
          <Skeleton className="h-5 w-12 mt-1.5 rounded-full" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </nav>
        <div className="flex h-16 shrink-0 items-center border-t border-separator px-4">
          <Skeleton className="h-4 w-16" />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-separator px-6 py-3">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <PageContainer size="editor" className="py-8 lg:px-10">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-72 mb-8" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-2/3 rounded-md" />
            </div>
          </PageContainer>
        </div>

        <div className="flex h-16 shrink-0 items-center justify-between border-t border-separator px-6">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function DraftNotFound({ orgId }: { orgId: string }) {
  return (
    <EmptyState icon={FileXIcon} title="Draft not found" description="This draft may have been deleted or published.">
      <Link to="/org/$orgId/jobs" params={{ orgId }} search={{ status: 'all' }} className="mt-4">
        <Button variant="outline" size="sm">
          Back to jobs
        </Button>
      </Link>
    </EmptyState>
  );
}
