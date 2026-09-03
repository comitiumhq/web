import type {
  CandidateSheetActionState,
  CandidateSheetCapabilities,
  CandidateSheetCurrentActivity,
} from '@comitium/schemas/applications';
import { ScrollArea } from '@comitium/ui/scroll-area';
import type { PendingInterviewEvent } from '@/lib/interviews/feedback';
import type {
  ApplicationReviewActivity,
  ScheduleInterviewActivity,
  SendEmailActivity,
} from '@/lib/schemas/stage-activities';

import { CurrentActivitiesSection } from './current-activities-section';
import { InterviewProgressSection } from './interview-progress-section';
import { useCandidateActivitiesModel } from './use-candidate-activities-model';

interface CandidateActivitiesProps {
  applicationId: string | null;
  orgId: string;
  currentStageId: string | null;
  jobId: string;
  capabilities: CandidateSheetCapabilities['consideration'];
  actionState: CandidateSheetActionState;
  currentActivities: CandidateSheetCurrentActivity[];
  onSchedule: () => void;
  onCreateDirectBookingLink: () => void;
  onScheduleActivity: (activity: ScheduleInterviewActivity) => void;
  onCreateDirectBookingLinkFromActivity: (activity: ScheduleInterviewActivity) => void;
  onSendFromActivity: (activity: SendEmailActivity) => void;
  onReviewActivity: (activity: ApplicationReviewActivity) => void;
  onSubmitInterviewFeedback: (event: PendingInterviewEvent) => void;
}

export function CandidateActivities({
  applicationId,
  orgId,
  currentStageId,
  jobId,
  capabilities,
  actionState,
  currentActivities,
  onSchedule,
  onCreateDirectBookingLink,
  onScheduleActivity,
  onCreateDirectBookingLinkFromActivity,
  onSendFromActivity,
  onReviewActivity,
  onSubmitInterviewFeedback,
}: CandidateActivitiesProps) {
  const activities = useCandidateActivitiesModel({
    applicationId,
    currentStageId,
    jobId,
    actionState,
    currentActivities,
  });

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-5 px-4 pb-5 pt-20">
        <CurrentActivitiesSection
          applicationId={applicationId}
          orgId={orgId}
          capabilities={capabilities}
          actionState={actionState}
          currentActivityById={activities.currentActivityById}
          emptyMessage={activities.emptyActivityMessage}
          interviews={activities.interviews}
          primaryActivity={activities.primaryActivity}
          primaryInterviewFeedback={activities.primaryInterviewFeedback}
          secondaryActivities={activities.secondaryActivities}
          secondaryFeedbackEvents={activities.secondaryFeedbackEvents}
          isLoading={activities.isActivitiesLoading}
          sourceIssues={activities.sourceIssues}
          onSchedule={onScheduleActivity}
          onCreateDirectBookingLink={onCreateDirectBookingLinkFromActivity}
          onSend={onSendFromActivity}
          onReview={onReviewActivity}
          onSubmitInterviewFeedback={onSubmitInterviewFeedback}
        />

        <InterviewProgressSection
          orgId={orgId}
          visits={activities.interviewProgress}
          canCreateInterview={capabilities.canSchedule}
          hasData={activities.hasInterviewProgressData}
          isLoading={activities.isInterviewProgressLoading}
          isError={activities.isInterviewProgressError}
          onManualSchedule={onSchedule}
          onDirectBooking={onCreateDirectBookingLink}
          onRetry={activities.handleRetryProgress}
        />
      </div>
    </ScrollArea>
  );
}
