import { Card } from '@comitium/ui/card';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { useMemo } from 'react';
import { InterviewCard } from '@/components/features/interviews/interview-card';
import { CURRENT_INTERVIEW_STATUSES } from '@/lib/interviews/feedback';
import { type InterviewEvent, type InterviewSchedule, InterviewStatus } from '@/lib/schemas/interviews';

interface CurrentInterviewsProps {
  applicationId: string;
  orgId: string;
  schedules: InterviewSchedule[];
  canManage: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onLoadMore: () => void;
}

export function CurrentInterviews({
  applicationId,
  orgId,
  schedules,
  canManage,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onLoadMore,
}: CurrentInterviewsProps) {
  const eventCards = useMemo(() => getCurrentInterviewCards(schedules), [schedules]);

  if (eventCards.length === 0 && !hasNextPage) {
    return null;
  }

  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="divide-y divide-border">
        {eventCards.map((card) => (
          <InterviewCard
            key={card.event.id}
            interview={card.event}
            scheduleId={card.scheduleId}
            scheduleCreatedAt={card.scheduleCreatedAt}
            availabilityRequestedAt={card.availabilityRequestedAt}
            applicationId={applicationId}
            orgId={orgId}
            canManage={canManage}
          />
        ))}
      </div>

      <InfiniteCollectionStatus
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isFetchNextPageError={isFetchNextPageError}
        loadingLabel="Loading interviews..."
        errorLabel="Could not load more interviews."
        onLoadMore={onLoadMore}
      />
    </Card>
  );
}

export function hasCurrentInterviews(schedules: InterviewSchedule[]): boolean {
  return schedules.some((schedule) => schedule.events.some(isCurrentInterviewEvent));
}

interface CurrentInterviewCard {
  scheduleId: string;
  scheduleCreatedAt: string;
  availabilityRequestedAt: string | null;
  event: InterviewEvent;
}

export function getCurrentInterviewCards(schedules: InterviewSchedule[]): CurrentInterviewCard[] {
  return schedules.flatMap((schedule) =>
    schedule.events.filter(isCurrentInterviewEvent).map((event) => ({
      scheduleId: schedule.id,
      scheduleCreatedAt: schedule.createdAt,
      availabilityRequestedAt: schedule.availabilityRequestedAt,
      event,
    })),
  );
}

function isCurrentInterviewEvent(event: InterviewEvent): boolean {
  if (!CURRENT_INTERVIEW_STATUSES.has(event.status)) {
    return false;
  }

  return event.status !== InterviewStatus.NEEDS_SCHEDULING || event.scheduledAt !== null;
}
