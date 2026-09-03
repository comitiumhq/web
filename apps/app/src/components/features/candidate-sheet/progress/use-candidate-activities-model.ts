import type {
  CandidateSheetActionState,
  CandidateSheetCurrentActivity,
  CandidateSheetNextAction,
} from '@comitium/schemas/applications';
import { useCallback, useMemo } from 'react';
import {
  useQueryApplicationInterviewProgress,
  useQueryApplicationInterviews,
} from '@/hooks/queries/use-query-interviews';
import { useQueryStageActivities } from '@/hooks/queries/use-query-stage-activities';
import type { PendingInterviewEvent } from '@/lib/interviews/feedback';
import type { StageActivity } from '@/lib/schemas/stage-activities';
import { isDefined } from '@/lib/utils';

import { getCandidateSheetEmptyActivityMessage } from '../model/candidate-sheet-action-state';

interface UseCandidateActivitiesModelParams {
  applicationId: string | null;
  currentStageId: string | null;
  jobId: string;
  actionState: CandidateSheetActionState;
  currentActivities: CandidateSheetCurrentActivity[];
}

export interface ActivitySourceIssue {
  key: 'stage-activities' | 'interviews';
  message: string;
  onRetry: () => void;
}

export function useCandidateActivitiesModel({
  applicationId,
  currentStageId,
  jobId,
  actionState,
  currentActivities,
}: UseCandidateActivitiesModelParams) {
  const activitiesQuery = useQueryStageActivities(jobId, currentStageId);
  const interviewsQuery = useQueryApplicationInterviews(applicationId);
  const progressQuery = useQueryApplicationInterviewProgress(applicationId);

  const interviewSchedules = interviewsQuery.data?.data ?? [];
  const isCurrentWorkBlocked = !shouldShowCurrentWork(actionState);
  const currentActivityById = useMemo(
    () =>
      new Map(
        currentActivities.flatMap((activity) => {
          if (activity.kind === 'interview_feedback') {
            return [];
          }

          return [[activity.activityId, activity] as const];
        }),
      ),
    [currentActivities],
  );

  const pendingActivities = useMemo(() => {
    if (isCurrentWorkBlocked) {
      return [];
    }

    return getPendingActivities({
      activities: activitiesQuery.data?.data ?? [],
      currentActivityById,
    });
  }, [isCurrentWorkBlocked, activitiesQuery.data?.data, currentActivityById]);

  const pendingInterviewEvents = useMemo<PendingInterviewFeedbackActivity[]>(() => {
    if (isCurrentWorkBlocked) {
      return [];
    }

    return getPendingInterviewFeedback(currentActivities);
  }, [isCurrentWorkBlocked, currentActivities]);

  const primaryActivity = useMemo(
    () => findPrimaryActivity(pendingActivities, actionState.nextAction),
    [pendingActivities, actionState.nextAction],
  );

  const primaryInterviewFeedback = useMemo(
    () => findPrimaryInterviewFeedback(pendingInterviewEvents, actionState.nextAction),
    [pendingInterviewEvents, actionState.nextAction],
  );

  const secondaryActivities = useMemo(
    () => pendingActivities.filter((activity) => activity.id !== primaryActivity?.id),
    [pendingActivities, primaryActivity?.id],
  );

  const secondaryFeedbackEvents = useMemo(
    () => pendingInterviewEvents.filter((event) => event.id !== primaryInterviewFeedback?.id),
    [pendingInterviewEvents, primaryInterviewFeedback?.id],
  );

  const handleRetryProgress = useCallback(() => {
    progressQuery.refetch();
  }, [progressQuery.refetch]);

  const handleRetryStageActivities = useCallback(() => {
    activitiesQuery.refetch();
  }, [activitiesQuery.refetch]);

  const handleRetryInterviews = useCallback(() => {
    interviewsQuery.refetch();
  }, [interviewsQuery.refetch]);

  const handleLoadMoreInterviews = useCallback(() => {
    interviewsQuery.fetchNextPage();
  }, [interviewsQuery.fetchNextPage]);

  const isActivitiesLoading =
    !isCurrentWorkBlocked && [activitiesQuery.isLoading, interviewsQuery.isLoading].some(Boolean);

  const sourceIssues = [
    getSourceIssue(
      !isCurrentWorkBlocked && activitiesQuery.isError,
      'stage-activities',
      activitiesQuery.data ? 'Stage activities may be out of date.' : 'Stage activities could not be loaded.',
      handleRetryStageActivities,
    ),
    getSourceIssue(
      !isCurrentWorkBlocked && interviewsQuery.isError,
      'interviews',
      interviewsQuery.data ? 'Interview status may be out of date.' : 'Interview status could not be loaded.',
      handleRetryInterviews,
    ),
  ].filter(isDefined);

  const isInterviewProgressError = progressQuery.isError;

  return {
    currentActivityById,
    emptyActivityMessage: getCandidateSheetEmptyActivityMessage(actionState),
    interviews: {
      schedules: isCurrentWorkBlocked ? [] : interviewSchedules,
      hasNextPage: !isCurrentWorkBlocked && Boolean(interviewsQuery.hasNextPage),
      isFetchingNextPage: interviewsQuery.isFetchingNextPage,
      isFetchNextPageError: interviewsQuery.isFetchNextPageError,
      onLoadMore: handleLoadMoreInterviews,
    },
    handleRetryProgress,
    interviewProgress: progressQuery.data?.data ?? [],
    hasInterviewProgressData: Boolean(progressQuery.data),
    isInterviewProgressError,
    isInterviewProgressLoading: progressQuery.isLoading,
    isActivitiesLoading,
    primaryActivity,
    primaryInterviewFeedback,
    secondaryActivities,
    secondaryFeedbackEvents,
    sourceIssues,
  };
}

export function shouldShowCurrentWork(actionState: CandidateSheetActionState): boolean {
  return actionState.blockedReason === null;
}

interface GetPendingActivitiesParams {
  activities: StageActivity[];
  currentActivityById: Map<string, CandidateSheetCurrentActivity>;
}

export function getPendingActivities({ activities, currentActivityById }: GetPendingActivitiesParams): StageActivity[] {
  return activities.filter((activity) => currentActivityById.has(activity.id));
}

function getSourceIssue(
  hasError: boolean,
  key: ActivitySourceIssue['key'],
  message: string,
  onRetry: () => void,
): ActivitySourceIssue | null {
  if (!hasError) {
    return null;
  }

  return { key, message, onRetry };
}

export interface PendingInterviewFeedbackActivity extends PendingInterviewEvent {
  canAct: boolean;
  completedCount: number;
  requiredCount: number;
  currentUserRequired: boolean;
  currentUserSubmitted: boolean;
}

export function getPendingInterviewFeedback(
  currentActivities: CandidateSheetCurrentActivity[],
): PendingInterviewFeedbackActivity[] {
  return currentActivities.flatMap((activity) => {
    if (activity.kind !== 'interview_feedback') {
      return [];
    }

    return [
      {
        id: activity.interviewEventId,
        title: activity.title,
        scheduledAt: activity.scheduledAt,
        canAct: activity.canAct,
        completedCount: activity.feedback.completedCount,
        requiredCount: activity.feedback.requiredCount,
        currentUserRequired: activity.feedback.currentUserRequired,
        currentUserSubmitted: activity.feedback.currentUserSubmitted,
      },
    ];
  });
}

function findPrimaryActivity(
  activities: StageActivity[],
  nextAction: CandidateSheetNextAction | null,
): StageActivity | null {
  if (!nextAction || !('activityId' in nextAction)) {
    return null;
  }

  return activities.find((activity) => activity.id === nextAction.activityId) ?? null;
}

function findPrimaryInterviewFeedback(
  events: PendingInterviewFeedbackActivity[],
  nextAction: CandidateSheetNextAction | null,
): PendingInterviewFeedbackActivity | null {
  if (!nextAction || nextAction.kind !== 'submit_feedback' || !nextAction.interviewId) {
    return null;
  }

  return events.find((event) => event.id === nextAction.interviewId) ?? null;
}
