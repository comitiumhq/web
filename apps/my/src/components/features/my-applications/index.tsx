import type { MyApplicationResponse } from '@comitium/schemas/applications';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { PageContainer } from '@comitium/ui/page-container';
import { PageHeader } from '@comitium/ui/page-header';
import { Skeleton } from '@comitium/ui/skeleton';
import {
  ArchiveIcon,
  CheckCircleIcon,
  type Icon as PhosphorIcon,
  TrayIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useQueryApplicantStakeReturn } from '@/hooks/queries/use-query-applicant-stake-return';
import { useQueryMyApplications } from '@/hooks/queries/use-query-my-applications';
import { ApplicationCard } from './application-card';
import { StakeReturnCard } from './stake-return-card';
import { type FilterValue, StatsHeader } from './stats-header';
import { calculateStats, matchesApplicationFilter } from './utils';

type EmptyStateKey = NonNullable<FilterValue> | 'all';

function filterApplications(applications: MyApplicationResponse[], filter: FilterValue) {
  if (filter === null) {
    return applications;
  }

  return applications.filter((app) => matchesApplicationFilter(app, filter));
}

function DashboardHeader() {
  return (
    <PageHeader
      title="Applications"
      description="Track your applications, employer responses, and eligible deposit returns."
    />
  );
}

interface ApplicationsStatusCardProps {
  icon: PhosphorIcon;
  title: string;
  description: string;
  children?: ReactNode;
}

function ApplicationsStatusCard({ icon: Icon, title, description, children }: ApplicationsStatusCardProps) {
  return (
    <Card className="items-center gap-0 py-10 text-center">
      <CardContent className="flex flex-col items-center gap-4">
        <Icon className="size-9 text-muted-foreground/60" aria-hidden="true" />
        <div className="space-y-2">
          <h2 className="text-heading-20">{title}</h2>
          <p className="max-w-sm text-copy-14 text-muted-foreground">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ContentEmptyState({ filter, onShowAll }: { filter: FilterValue; onShowAll: () => void }) {
  const key: EmptyStateKey = filter ?? 'all';

  const content: Record<EmptyStateKey, { icon: PhosphorIcon; title: string; description: string }> = {
    all: {
      icon: TrayIcon,
      title: 'No applications yet',
      description: 'Apply to open roles and track every response from this page.',
    },
    active: {
      icon: TrayIcon,
      title: 'No active applications',
      description: 'Submitted and in-process applications will show here.',
    },
    action: {
      icon: CheckCircleIcon,
      title: 'No action needed',
      description: 'Applications that need something from you will appear here.',
    },
    closed: {
      icon: ArchiveIcon,
      title: 'No closed applications',
      description: 'Settled applications will appear here.',
    },
  };

  const { icon, title, description } = content[key];

  return (
    <ApplicationsStatusCard icon={icon} title={title} description={description}>
      {filter !== null && (
        <Button variant="outline" size="sm" onClick={onShowAll}>
          Show all applications
        </Button>
      )}
    </ApplicationsStatusCard>
  );
}

function ErrorState({ isRetrying, onRetry }: { isRetrying: boolean; onRetry: () => void }) {
  return (
    <ApplicationsStatusCard
      icon={WarningCircleIcon}
      title="Applications failed to load"
      description="Refresh the page or try again in a moment."
    >
      <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
        Try again
      </Button>
    </ApplicationsStatusCard>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="min-h-[5.5rem] gap-0 px-4 py-4">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-7 w-12 mt-2" />
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="gap-0 py-0">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex-1 flex items-stretch justify-between gap-2">
                  <div className="min-w-0">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2 mt-1" />
                    <Skeleton className="h-3 w-1/3 mt-2" />
                  </div>
                  <div className="shrink-0">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <PageContainer size="list" className="pt-8 pb-8">
      <DashboardHeader />
      <div className="mt-6">{children}</div>
    </PageContainer>
  );
}

export function MyApplicationsDashboard() {
  const { data: applications, isLoading, error, refetch, isFetching } = useQueryMyApplications();
  const { data: stakeReturnAvailability } = useQueryApplicantStakeReturn();
  const [activeFilter, setActiveFilter] = useState<FilterValue>(null);

  const stats = useMemo(() => (applications ? calculateStats(applications) : null), [applications]);

  const filtered = useMemo(
    () => (applications ? filterApplications(applications, activeFilter) : []),
    [applications, activeFilter],
  );

  const handleShowAll = useCallback(() => {
    setActiveFilter(null);
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <DashboardShell>
        <DashboardSkeleton />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <ErrorState isRetrying={isFetching} onRetry={handleRetry} />
      </DashboardShell>
    );
  }

  if (!stats) {
    return (
      <DashboardShell>
        <ContentEmptyState filter={activeFilter} onShowAll={handleShowAll} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <StatsHeader stats={stats} activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {stakeReturnAvailability && stakeReturnAvailability.count > 0 ? (
        <StakeReturnCard availability={stakeReturnAvailability} />
      ) : null}

      <div className="mt-6">
        {filtered.length === 0 ? (
          <ContentEmptyState filter={activeFilter} onShowAll={handleShowAll} />
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
