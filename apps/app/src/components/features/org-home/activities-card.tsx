import { ActivityIcon } from '@comitium/ui/activity-icon';
import { Badge } from '@comitium/ui/badge';
import { CardContent, CardTitle } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { CircleCheckIcon, FlagIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HomeCard, HomeCardHeader } from './home-card';
import { getAttentionCounts } from './home-data';
import { HomeEmptyState } from './home-empty-state';
import { HomeList, homeListRowClassName } from './home-list';
import { HomeSkeletonRows } from './home-skeleton-rows';

interface ActivitiesCardProps {
  applicationReviewCount: number | null;
  interviewsToScheduleCount: number;
  isLoading: boolean;
  offerCount: number | null;
  orgId: string;
}

interface PipelineActivityRowProps {
  countLabel: string;
  icon: ReactNode;
  label: string;
  orgId: string;
  tab: 'review' | 'active' | 'offer';
}

export function ActivitiesCard({
  applicationReviewCount,
  interviewsToScheduleCount,
  isLoading,
  offerCount,
  orgId,
}: ActivitiesCardProps) {
  const counts = getAttentionCounts({ applicationReviewCount, interviewsToScheduleCount, offerCount });

  return (
    <HomeCard>
      <HomeCardHeader>
        <CardTitle className="flex items-center gap-2">
          Activities
          {isLoading ? (
            <Skeleton className="h-5 w-10 rounded-4xl" />
          ) : (
            <Badge variant="secondary">{counts.totalLabel}</Badge>
          )}
        </CardTitle>
      </HomeCardHeader>
      <CardContent className={cn('flex flex-col', { 'min-h-0 flex-1': !isLoading && counts.total === 0 })}>
        {isLoading && <HomeSkeletonRows count={3} />}

        {!isLoading && counts.total > 0 && (
          <HomeList>
            <PipelineActivityRow
              countLabel={counts.reviewLabel}
              icon={<ActivityIcon kind="review" />}
              label="Reviews assigned to me"
              orgId={orgId}
              tab="review"
            />
            <PipelineActivityRow
              countLabel={counts.interviewLabel}
              icon={<ActivityIcon kind="schedule" />}
              label="Interviews to schedule"
              orgId={orgId}
              tab="active"
            />
            <PipelineActivityRow
              countLabel={counts.offerLabel}
              icon={
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-meta-foreground">
                  <FlagIcon className="size-4" />
                </span>
              }
              label="Offers to extend"
              orgId={orgId}
              tab="offer"
            />
          </HomeList>
        )}

        {!isLoading && counts.total === 0 && (
          <HomeEmptyState
            icon={CircleCheckIcon}
            title="You're all caught up"
            description="Tasks and offers requiring action will appear here."
          />
        )}
      </CardContent>
    </HomeCard>
  );
}

function PipelineActivityRow({ countLabel, icon, label, orgId, tab }: PipelineActivityRowProps) {
  return (
    <Link
      to="/org/$orgId/pipeline"
      params={{ orgId }}
      search={{ tab }}
      className={cn(homeListRowClassName, 'grid-cols-[auto_minmax(0,1fr)_auto]')}
    >
      {icon}
      <span className="min-w-0 truncate text-label-14 text-content-foreground">{label}</span>
      <ActivityCountBadge label={countLabel} />
    </Link>
  );
}

function ActivityCountBadge({ label }: { label: string }) {
  return (
    <Badge variant="secondary" className="min-w-7 tabular-nums">
      {label}
    </Badge>
  );
}
