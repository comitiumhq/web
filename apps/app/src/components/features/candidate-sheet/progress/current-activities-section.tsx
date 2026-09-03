import type {
  CandidateSheetActionState,
  CandidateSheetCapabilities,
  CandidateSheetCurrentActivity,
} from '@comitium/schemas/applications';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { InlineEmptyState } from '@comitium/ui/inline-empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { PendingInterviewEvent } from '@/lib/interviews/feedback';
import type { InterviewSchedule } from '@/lib/schemas/interviews';
import type {
  ApplicationReviewActivity,
  ScheduleInterviewActivity,
  SendEmailActivity,
  StageActivity,
} from '@/lib/schemas/stage-activities';

import { isPrimaryInterviewFeedbackAction } from '../model/candidate-sheet-action-state';
import { CandidateActivityRow, InterviewFeedbackActivityRow } from './current-activity-row';
import { CurrentInterviews, hasCurrentInterviews } from './current-interviews';
import type { ActivitySourceIssue, PendingInterviewFeedbackActivity } from './use-candidate-activities-model';

interface CurrentInterviewCollection {
  schedules: InterviewSchedule[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onLoadMore: () => void;
}

interface CurrentActivitiesSectionProps {
  applicationId: string | null;
  orgId: string;
  capabilities: CandidateSheetCapabilities['consideration'];
  actionState: CandidateSheetActionState;
  currentActivityById: Map<string, CandidateSheetCurrentActivity>;
  emptyMessage: string;
  interviews: CurrentInterviewCollection;
  primaryActivity: StageActivity | null;
  primaryInterviewFeedback: PendingInterviewFeedbackActivity | null;
  secondaryActivities: StageActivity[];
  secondaryFeedbackEvents: PendingInterviewFeedbackActivity[];
  isLoading: boolean;
  sourceIssues: ActivitySourceIssue[];
  onSchedule: (activity: ScheduleInterviewActivity) => void;
  onCreateDirectBookingLink: (activity: ScheduleInterviewActivity) => void;
  onSend: (activity: SendEmailActivity) => void;
  onReview: (activity: ApplicationReviewActivity) => void;
  onSubmitInterviewFeedback: (event: PendingInterviewEvent) => void;
}

const ACTIVITY_SOURCE_TITLES: Record<ActivitySourceIssue['key'], string> = {
  'stage-activities': 'Stage activities unavailable',
  interviews: 'Interview status unavailable',
};

export function CurrentActivitiesSection({
  applicationId,
  orgId,
  capabilities,
  actionState,
  currentActivityById,
  emptyMessage,
  interviews,
  primaryActivity,
  primaryInterviewFeedback,
  secondaryActivities,
  secondaryFeedbackEvents,
  isLoading,
  sourceIssues,
  onSchedule,
  onCreateDirectBookingLink,
  onSend,
  onReview,
  onSubmitInterviewFeedback,
}: CurrentActivitiesSectionProps) {
  const hasActivities =
    Boolean(primaryActivity) ||
    Boolean(primaryInterviewFeedback) ||
    secondaryActivities.length > 0 ||
    secondaryFeedbackEvents.length > 0 ||
    hasCurrentInterviews(interviews.schedules) ||
    interviews.hasNextPage;

  const hasActivityRows =
    Boolean(primaryActivity) ||
    Boolean(primaryInterviewFeedback) ||
    secondaryActivities.length > 0 ||
    secondaryFeedbackEvents.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="min-h-8 text-heading-14">Current Activities</h3>

      {isLoading && !hasActivities && <CurrentActivitySkeleton />}

      {sourceIssues.map((issue) => (
        <InlineEmptyState
          key={issue.key}
          icon={WarningCircleIcon}
          title={ACTIVITY_SOURCE_TITLES[issue.key]}
          description={issue.message}
          action={
            <Button type="button" variant="outline" size="sm" onClick={issue.onRetry}>
              Try again
            </Button>
          }
        />
      ))}

      {hasActivityRows && (
        <Card size="sm" className="gap-0 py-0">
          <div className="divide-y divide-border">
            {primaryInterviewFeedback && (
              <InterviewFeedbackActivityRow
                event={primaryInterviewFeedback}
                orgId={orgId}
                onSubmit={onSubmitInterviewFeedback}
                canAct={primaryInterviewFeedback.canAct}
                emphasized={isPrimaryInterviewFeedbackAction(actionState, primaryInterviewFeedback.id)}
              />
            )}
            {primaryActivity && (
              <CandidateActivityRow
                activity={primaryActivity}
                activityState={currentActivityById.get(primaryActivity.id) ?? null}
                orgId={orgId}
                actionState={actionState}
                onSchedule={onSchedule}
                onCreateDirectBookingLink={onCreateDirectBookingLink}
                onSend={onSend}
                onReview={onReview}
              />
            )}
            {secondaryFeedbackEvents.map((event) => (
              <InterviewFeedbackActivityRow
                key={event.id}
                event={event}
                orgId={orgId}
                onSubmit={onSubmitInterviewFeedback}
                canAct={event.canAct}
                emphasized={false}
              />
            ))}
            {secondaryActivities.map((activity) => (
              <CandidateActivityRow
                key={activity.id}
                activity={activity}
                activityState={currentActivityById.get(activity.id) ?? null}
                orgId={orgId}
                actionState={actionState}
                onSchedule={onSchedule}
                onCreateDirectBookingLink={onCreateDirectBookingLink}
                onSend={onSend}
                onReview={onReview}
              />
            ))}
          </div>
        </Card>
      )}

      {applicationId && (
        <CurrentInterviews
          applicationId={applicationId}
          orgId={orgId}
          schedules={interviews.schedules}
          canManage={capabilities.canSchedule}
          hasNextPage={interviews.hasNextPage}
          isFetchingNextPage={interviews.isFetchingNextPage}
          isFetchNextPageError={interviews.isFetchNextPageError}
          onLoadMore={interviews.onLoadMore}
        />
      )}

      {!isLoading && sourceIssues.length === 0 && !hasActivities && (
        <InlineEmptyState
          icon={CheckCircleIcon}
          title="No current activities"
          description={emptyMessage}
          className="min-h-20"
        />
      )}
    </section>
  );
}

function CurrentActivitySkeleton() {
  return (
    <Card size="sm" className="gap-0 py-0" aria-busy>
      <output className="sr-only">Loading current activities</output>
      <div className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <div className="min-w-0">
          <Skeleton className="h-3.5 w-36 max-w-full rounded-md" />
          <Skeleton className="mt-2 h-3 w-52 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
      </div>
    </Card>
  );
}
