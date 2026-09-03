import { Badge } from '@comitium/ui/badge';
import { CardContent, CardTitle } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { CalendarIcon, CaretRightIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';
import type { MyInterview } from '@/lib/schemas/interviews';
import { cn } from '@/lib/utils';

import { HomeCard, HomeCardHeader } from './home-card';
import { getInterviewTooltipLabel, getInterviewWhen, isInterviewFeedbackDue } from './home-data';
import { HomeEmptyState } from './home-empty-state';
import { HomeList, homeListRowClassName } from './home-list';
import { HomeSkeletonRows } from './home-skeleton-rows';

interface InterviewsCardProps {
  className?: string;
  interviews: readonly MyInterview[];
  isLoading: boolean;
  onInterviewOpen: (interview: MyInterview) => void;
}

export function InterviewsCard({ className, interviews, isLoading, onInterviewOpen }: InterviewsCardProps) {
  const interviewRows = interviews.map((interview) => (
    <InterviewRow key={interview.eventId} interview={interview} onOpen={onInterviewOpen} />
  ));

  return (
    <HomeCard className={className}>
      <HomeCardHeader>
        <CardTitle className="flex items-center gap-2">
          Interviews
          {isLoading ? (
            <Skeleton className="h-5 w-10 rounded-4xl" />
          ) : (
            <Badge variant="secondary">{interviews.length}</Badge>
          )}
        </CardTitle>
      </HomeCardHeader>
      <CardContent className="flex flex-col lg:min-h-0 lg:flex-1">
        {isLoading && <HomeSkeletonRows count={4} />}

        {!isLoading && interviews.length > 0 && (
          <div className="lg:h-full lg:overflow-y-auto">
            <HomeList>{interviewRows}</HomeList>
          </div>
        )}

        {!isLoading && interviews.length === 0 && (
          <HomeEmptyState
            icon={CalendarIcon}
            title="No interview tasks"
            description="Upcoming interviews and feedback tasks will appear here."
          />
        )}
      </CardContent>
    </HomeCard>
  );
}

const InterviewRow = memo(function InterviewRow({
  interview,
  onOpen,
}: {
  interview: MyInterview;
  onOpen: (interview: MyInterview) => void;
}) {
  const handleClick = useCallback(() => onOpen(interview), [interview, onOpen]);
  const isFeedbackDue = isInterviewFeedbackDue(interview);

  if (!interview.scheduledAt && !isFeedbackDue) {
    return null;
  }

  const when = interview.scheduledAt ? getInterviewWhen(interview.scheduledAt) : null;
  const whenVariant = when?.tone === 'today' ? 'info' : 'secondary';
  const exactTime = interview.scheduledAt
    ? getInterviewTooltipLabel(interview.scheduledAt, interview.durationMinutes)
    : null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(homeListRowClassName, 'w-full grid-cols-[minmax(0,1fr)_auto] text-left')}
    >
      <span className="min-w-0">
        <span className="block truncate text-label-14">{interview.title}</span>
        <span className="block truncate text-copy-14 text-muted-foreground">{interview.jobTitle}</span>
      </span>
      <span className="flex items-center justify-end gap-2">
        {when && exactTime && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex w-fit">
                <Badge variant={whenVariant} className="gap-1.5 tabular-nums">
                  <span>{when.dateLabel}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{when.timeLabel}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{interview.durationMinutes} min</span>
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>{exactTime}</TooltipContent>
          </Tooltip>
        )}

        {isFeedbackDue && <Badge variant="warning">Feedback due</Badge>}

        <CaretRightIcon className="size-3.5" />
      </span>
    </button>
  );
});
