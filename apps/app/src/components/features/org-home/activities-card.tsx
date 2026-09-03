import { Badge } from '@comitium/ui/badge';
import { CardContent, CardTitle } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { CalendarDotsIcon, CheckCircleIcon, FlagIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { ApplicationReviewIcon } from '@/lib/constants/domain-icons';
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
  icon: PhosphorIcon;
  label: string;
  orgId: string;
  tab: 'review' | 'offer';
}

interface InterviewActivityRowProps {
  countLabel: string;
  orgId: string;
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
          Needs your attention
          {isLoading ? (
            <Skeleton className="h-5 w-10 rounded-4xl" />
          ) : (
            <Badge variant="secondary">{counts.totalLabel}</Badge>
          )}
        </CardTitle>
      </HomeCardHeader>
      <CardContent className="flex flex-col">
        {isLoading && <HomeSkeletonRows count={3} />}

        {!isLoading && counts.total > 0 && (
          <HomeList>
            <PipelineActivityRow
              countLabel={counts.reviewLabel}
              icon={ApplicationReviewIcon}
              label="Reviews assigned to me"
              orgId={orgId}
              tab="review"
            />
            <InterviewActivityRow countLabel={counts.interviewLabel} orgId={orgId} />
            <PipelineActivityRow
              countLabel={counts.offerLabel}
              icon={FlagIcon}
              label="Offers to extend"
              orgId={orgId}
              tab="offer"
            />
          </HomeList>
        )}

        {!isLoading && counts.total === 0 && (
          <HomeEmptyState
            icon={CheckCircleIcon}
            title="You're all caught up"
            description="Reviews, scheduling tasks, and offers will appear here."
          />
        )}
      </CardContent>
    </HomeCard>
  );
}

function PipelineActivityRow({ countLabel, icon: Icon, label, orgId, tab }: PipelineActivityRowProps) {
  return (
    <Link
      to="/org/$orgId/pipeline"
      params={{ orgId }}
      search={{ tab }}
      className={cn(homeListRowClassName, 'grid-cols-[auto_minmax(0,1fr)_auto]')}
    >
      <Icon className="size-5 text-muted-foreground" />
      <span className="min-w-0 truncate text-label-14 text-foreground">{label}</span>
      <ActivityCountBadge label={countLabel} />
    </Link>
  );
}

function InterviewActivityRow({ countLabel, orgId }: InterviewActivityRowProps) {
  return (
    <Link
      to="/org/$orgId/pipeline"
      params={{ orgId }}
      search={{ tab: 'active' }}
      className={cn(homeListRowClassName, 'grid-cols-[auto_minmax(0,1fr)_auto]')}
    >
      <CalendarDotsIcon className="size-5 text-muted-foreground" />
      <span className="min-w-0 truncate text-label-14 text-foreground">Interviews to schedule</span>
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
