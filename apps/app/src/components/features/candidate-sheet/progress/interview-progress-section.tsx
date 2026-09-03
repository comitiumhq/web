import { Button } from '@comitium/ui/button';
import { BROWSER_TZ } from '@comitium/ui/date';
import { InlineEmptyState } from '@comitium/ui/inline-empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { ClockCounterClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { useQueryOrgTeamMap } from '@/hooks/queries/use-query-org-team';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import type { InterviewProgressStageVisit } from '@/lib/schemas/interviews';

import { InterviewProgressTable } from './interview-progress-table';
import { NewInterviewButton } from './new-interview-button';

interface InterviewProgressSectionProps {
  orgId: string;
  visits: InterviewProgressStageVisit[];
  canCreateInterview: boolean;
  hasData: boolean;
  isLoading: boolean;
  isError: boolean;
  onManualSchedule: () => void;
  onDirectBooking: () => void;
  onRetry: () => void;
}

export function InterviewProgressSection({
  orgId,
  visits,
  canCreateInterview,
  hasData,
  isLoading,
  isError,
  onManualSchedule,
  onDirectBooking,
  onRetry,
}: InterviewProgressSectionProps) {
  const memberMap = useQueryOrgTeamMap(orgId);
  const { data: meData } = useQueryOrgMe(orgId);
  const timeZone = meData?.timezone ?? BROWSER_TZ;
  const handleRetry = useCallback(() => onRetry(), [onRetry]);
  const hasVisits = visits.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex min-h-8 items-center justify-between gap-3">
        <h3 className="text-heading-14">Interview Progress</h3>
        {canCreateInterview && (
          <NewInterviewButton orgId={orgId} onManualSchedule={onManualSchedule} onDirectBooking={onDirectBooking} />
        )}
      </header>

      {isLoading && !hasData && <InterviewProgressSkeleton />}

      {isError && (
        <InlineEmptyState
          icon={WarningCircleIcon}
          title={hasData ? 'Interview progress may be out of date' : 'Interview progress unavailable'}
          description={hasData ? 'The latest stage history could not be loaded.' : 'Stage history could not be loaded.'}
          action={
            <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
              Try again
            </Button>
          }
        />
      )}

      {hasData && hasVisits && <InterviewProgressTable visits={visits} memberMap={memberMap} timeZone={timeZone} />}

      {hasData && !isError && !hasVisits && (
        <InlineEmptyState
          icon={ClockCounterClockwiseIcon}
          title="No interview progress yet"
          description="Stage changes and completed interviews will appear here."
          className="min-h-20"
        />
      )}
    </section>
  );
}

function InterviewProgressSkeleton() {
  return (
    <div aria-busy>
      <output className="sr-only">Loading interview progress</output>

      <div className="flex flex-col divide-y divide-border rounded-xl ring-1 ring-foreground/10 sm:hidden">
        <CompactProgressSkeleton />
        <CompactProgressSkeleton />
      </div>

      <div className="hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 sm:block">
        <div className="grid grid-cols-[46%_18%_18%_18%] bg-muted/40 px-3 py-3">
          <Skeleton className="h-3 w-14 rounded-md" />
          <Skeleton className="h-3 w-12 justify-self-end rounded-md" />
          <Skeleton className="h-3 w-8 justify-self-end rounded-md" />
          <Skeleton className="h-3 w-12 justify-self-end rounded-md" />
        </div>
        <ProgressTableRowSkeleton />
        <ProgressTableRowSkeleton short />
      </div>
    </div>
  );
}

function ProgressTableRowSkeleton({ short = false }: { short?: boolean }) {
  return (
    <div className="grid grid-cols-[46%_18%_18%_18%] items-center border-t border-border px-3 py-3">
      <Skeleton className={short ? 'h-3.5 w-24 rounded-md' : 'h-3.5 w-36 max-w-full rounded-md'} />
      <Skeleton className="h-3 w-12 justify-self-end rounded-md" />
      <Skeleton className="h-3 w-10 justify-self-end rounded-md" />
      <Skeleton className="h-3 w-12 justify-self-end rounded-md" />
    </div>
  );
}

function CompactProgressSkeleton() {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-3.5 w-32 max-w-full rounded-md" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Skeleton className="h-3 w-12 rounded-md" />
        <Skeleton className="h-3 w-12 rounded-md" />
        <Skeleton className="h-3 w-12 rounded-md" />
      </div>
    </div>
  );
}
