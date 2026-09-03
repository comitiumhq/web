import type { CandidateProfile } from '@comitium/schemas/candidates';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { CardAction, CardContent, CardTitle } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import { StatusBadge, type StatusBadgeProps } from '@comitium/ui/status-badge';
import { CaretRightIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo, useCallback } from 'react';
import { getActivityBadge, getResponseDeadlineBadge } from '@/components/features/application-status';
import { CriteriaBadge, getCriteriaLabel } from '@/components/features/pipeline/shared/criteria-badge';
import { getApplicationReviewUrgencyState } from '@/components/features/pipeline/shared/pipeline-status';
import { UrgencyStripe } from '@/components/features/pipeline/shared/urgency-stripe';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';
import { cn, getCandidateDisplayName } from '@/lib/utils';
import { HomeCard, HomeCardHeader } from './home-card';
import { formatReviewQueueCount } from './home-data';
import { HomeEmptyState } from './home-empty-state';
import { HomeList, homeListRowClassName } from './home-list';
import { HomeSkeletonRows } from './home-skeleton-rows';

interface ApplicationReviewCardProps {
  candidates: readonly PipelineCandidate[];
  className?: string;
  isLoading: boolean;
  namesMap: Map<string, CandidateProfile>;
  onCandidateOpen: (candidate: PipelineCandidate) => void;
  orgId: string;
  totalCount: number | null;
}

interface ApplicationReviewRowProps {
  candidate: PipelineCandidate;
  name: string;
  onOpen: (candidate: PipelineCandidate) => void;
}

export function ApplicationReviewCard({
  candidates,
  className,
  isLoading,
  namesMap,
  onCandidateOpen,
  orgId,
  totalCount,
}: ApplicationReviewCardProps) {
  const count = formatReviewQueueCount(totalCount ?? candidates.length);
  const rows = candidates.map((candidate) => {
    const profile = namesMap.get(candidate.candidateId ?? '') ?? null;
    const name = getCandidateDisplayName({
      applicationId: candidate.id,
      candidateId: candidate.candidateId,
      profile,
    });

    return <ApplicationReviewRow key={candidate.id} candidate={candidate} name={name} onOpen={onCandidateOpen} />;
  });

  return (
    <HomeCard className={className}>
      <HomeCardHeader>
        <CardTitle className="flex items-center gap-2">
          Application Review
          {isLoading ? <Skeleton className="h-5 w-10 rounded-4xl" /> : <Badge variant="secondary">{count}</Badge>}
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon-xs" aria-label="Open application review" asChild>
            <Link to="/org/$orgId/pipeline" params={{ orgId }} search={{ tab: 'review' }}>
              <CaretRightIcon className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </HomeCardHeader>
      <CardContent className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {isLoading && <HomeSkeletonRows count={6} />}

        {!isLoading && candidates.length > 0 && <HomeList>{rows}</HomeList>}

        {!isLoading && candidates.length === 0 && (
          <HomeEmptyState
            icon={CheckCircleIcon}
            title="Your review queue is clear"
            description="Assigned reviews and passive reviews you can submit will appear here."
          />
        )}
      </CardContent>
    </HomeCard>
  );
}

const ApplicationReviewRow = memo(function ApplicationReviewRow({
  candidate,
  name,
  onOpen,
}: ApplicationReviewRowProps) {
  const primaryBadge = getApplicationReviewPrimaryBadge(candidate);
  const hasCriteriaBadge = getCriteriaLabel(candidate) !== '—';
  const hasSignals = primaryBadge !== null || hasCriteriaBadge;
  const urgency = getApplicationReviewUrgencyState(candidate.isResponded, candidate.responseDeadline);
  const handleClick = useCallback(() => {
    onOpen(candidate);
  }, [candidate, onOpen]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        homeListRowClassName,
        'w-full grid-cols-1 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
      )}
    >
      <UrgencyStripe level={urgency.level} reason={urgency.reason} />
      <span className="min-w-0">
        <span className="block truncate text-label-14">{name}</span>
        <span className="block truncate text-copy-14 text-muted-foreground">{candidate.jobTitle}</span>
      </span>
      {hasSignals && (
        <span className="flex min-h-5 min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
          {primaryBadge && <StatusBadge {...primaryBadge} />}
          {hasCriteriaBadge && <CriteriaBadge candidate={candidate} labelVariant="descriptive" />}
        </span>
      )}
    </button>
  );
});

function getApplicationReviewPrimaryBadge(candidate: PipelineCandidate): StatusBadgeProps | null {
  const activityBadge = getActivityBadge({
    reviewStatus: candidate.reviewStatus,
    interviewStatus: candidate.interviewStatus,
    interviewScheduledAt: candidate.interviewScheduledAt,
  });

  if (activityBadge) {
    return activityBadge;
  }

  return getResponseDeadlineBadge(candidate.isResponded, candidate.responseDeadline);
}
