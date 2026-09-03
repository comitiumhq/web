import type { CriteriaAssessment, CriterionSummary, ReviewStatus } from '@comitium/schemas/applications';
import type { WrappedKey } from '@comitium/schemas/common';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useQueryFeedbackSubmissions } from '@/hooks/queries/use-query-feedback-submissions';
import { useQueryApplicationInterviews } from '@/hooks/queries/use-query-interviews';
import { useQueryOrgTeamMap } from '@/hooks/queries/use-query-org-team';
import { useQueryStageActivities } from '@/hooks/queries/use-query-stage-activities';
import type { InterviewEventRef } from '@/lib/interviews/feedback';
import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';

import { type ProjectableFormSubmission, useProjectFormSubmissions } from '../../hooks/use-project-form-submission';

import { CriteriaEvaluation } from './criteria-evaluation';
import { Empty, ErrorState, GatedEmpty, LoadingState } from './empty-states';
import { buildGroups } from './group-builder';
import { GroupCard } from './group-card';
import type { FeedbackAccessState, SourceGroup } from './types';
import { useDecryptedSubmissions } from './use-decrypted-submissions';

interface FeedbackTabAccess extends FeedbackAccessState {
  canProjectFormFields: boolean;
}

interface FeedbackTabProps {
  applicationId: string | null;
  candidateId: string | null;
  orgId: string;
  jobId: string;
  currentStageId: string | null;
  currentUserId: string;
  criterionSummary: CriterionSummary | null;
  criterionAssessments: CriteriaAssessment[];
  reviewStatus: ReviewStatus;
  access: FeedbackTabAccess;
  wrappedVaultKey: WrappedKey | undefined;
  onReviewActivity: ((activity: ApplicationReviewActivity) => void) | null;
  onSubmitInterviewFeedback: ((event: InterviewEventRef) => void) | null;
}

export function FeedbackTab({
  applicationId,
  candidateId,
  orgId,
  jobId,
  currentStageId,
  currentUserId,
  criterionSummary,
  criterionAssessments,
  reviewStatus,
  access,
  wrappedVaultKey,
  onReviewActivity,
  onSubmitInterviewFeedback,
}: FeedbackTabProps) {
  const {
    data: submissions,
    isLoading,
    isError,
    refetch: refetchSubmissions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useQueryFeedbackSubmissions(applicationId ?? undefined);
  const {
    data: stageActivities,
    isLoading: isStageActivitiesLoading,
    isError: isStageActivitiesError,
    refetch: refetchStageActivities,
  } = useQueryStageActivities(jobId, currentStageId);
  const {
    data: interviewsData,
    isLoading: isInterviewsLoading,
    isError: isInterviewsError,
    refetch: refetchInterviews,
  } = useQueryApplicationInterviews(applicationId);

  const liveSubmissions = useMemo(
    () => (submissions ?? []).filter((s) => !s.isDeleted).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [submissions],
  );

  const reviewActivities = useMemo<ApplicationReviewActivity[]>(
    () =>
      (stageActivities?.data ?? []).filter(
        (a): a is ApplicationReviewActivity => a.activityType === 'application_review',
      ),
    [stageActivities?.data],
  );

  const schedules = useMemo(() => interviewsData?.data ?? [], [interviewsData?.data]);

  const groups = useMemo(
    () => buildGroups(reviewActivities, schedules, liveSubmissions, currentUserId, access),
    [reviewActivities, schedules, liveSubmissions, currentUserId, access],
  );
  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);
  const handleRetry = useCallback(() => {
    void Promise.all([refetchSubmissions(), refetchStageActivities(), refetchInterviews()]);
  }, [refetchInterviews, refetchStageActivities, refetchSubmissions]);
  const hasCriteriaEvaluation = Boolean(criterionSummary && criterionAssessments.length > 0);
  const isInitialLoading =
    (isLoading && !submissions) ||
    (isStageActivitiesLoading && !stageActivities) ||
    (isInterviewsLoading && !interviewsData);
  const isInitialError =
    (isError && !submissions) || (isStageActivitiesError && !stageActivities) || (isInterviewsError && !interviewsData);
  const feedbackState = getFeedbackState(
    isInitialLoading,
    isInitialError,
    groups.length,
    reviewStatus.currentUserHasPendingReview,
    hasCriteriaEvaluation,
    handleRetry,
  );

  return (
    <div className="flex flex-col gap-4">
      {criterionSummary && criterionAssessments.length > 0 && (
        <CriteriaEvaluation
          assessment={criterionAssessments}
          summary={criterionSummary}
          orgId={orgId}
          wrappedVaultKey={wrappedVaultKey}
        />
      )}
      {feedbackState}
      {!isInitialLoading && groups.length > 0 && (
        <>
          <GroupsList
            groups={groups}
            applicationId={applicationId}
            candidateId={candidateId}
            orgId={orgId}
            wrappedVaultKey={wrappedVaultKey}
            canProjectFormFields={access.canProjectFormFields}
            currentUserId={currentUserId}
            onReviewActivity={onReviewActivity}
            onSubmitInterviewFeedback={onSubmitInterviewFeedback}
          />
          <InfiniteCollectionStatus
            hasNextPage={Boolean(hasNextPage)}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            loadingLabel="Loading feedback..."
            errorLabel="Could not load more feedback."
            onLoadMore={handleLoadMore}
          />
        </>
      )}
    </div>
  );
}

function getFeedbackState(
  isLoading: boolean,
  isError: boolean,
  groupCount: number,
  isStagePending: boolean,
  hasCriteriaEvaluation: boolean,
  onRetry: () => void,
): ReactNode {
  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (groupCount === 0) {
    if (isStagePending) {
      return <GatedEmpty />;
    }

    return hasCriteriaEvaluation ? null : <Empty />;
  }

  return null;
}

interface GroupsListProps {
  groups: SourceGroup[];
  applicationId: string | null;
  candidateId: string | null;
  orgId: string;
  wrappedVaultKey: WrappedKey | undefined;
  canProjectFormFields: boolean;
  currentUserId: string;
  onReviewActivity: ((activity: ApplicationReviewActivity) => void) | null;
  onSubmitInterviewFeedback: ((event: InterviewEventRef) => void) | null;
}

function GroupsList({
  groups,
  applicationId,
  candidateId,
  orgId,
  wrappedVaultKey,
  canProjectFormFields,
  currentUserId,
  onReviewActivity,
  onSubmitInterviewFeedback,
}: GroupsListProps) {
  const allSubmissions = useMemo(
    () =>
      groups.flatMap((g) =>
        g.items
          .filter((i): i is { kind: 'submitted'; submission: FeedbackSubmission } => i.kind === 'submitted')
          .map((i) => i.submission),
      ),
    [groups],
  );
  const decryptedMap = useDecryptedSubmissions(allSubmissions, orgId, wrappedVaultKey);
  const projectableSubmissions = useMemo<ProjectableFormSubmission[]>(
    () =>
      allSubmissions.flatMap((submission) => {
        const entry = decryptedMap.get(submission.id);

        return entry?.status === 'ready'
          ? [{ id: submission.id, formId: submission.formId, answers: entry.values }]
          : [];
      }),
    [allSubmissions, decryptedMap],
  );
  useProjectFormSubmissions({
    orgId,
    candidateId,
    submissions: projectableSubmissions,
    enabled: canProjectFormFields,
  });
  const memberMap = useQueryOrgTeamMap(orgId);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          applicationId={applicationId}
          orgId={orgId}
          decryptedMap={decryptedMap}
          memberMap={memberMap}
          currentUserId={currentUserId}
          onReviewActivity={onReviewActivity}
          onSubmitInterviewFeedback={onSubmitInterviewFeedback}
        />
      ))}
    </div>
  );
}
