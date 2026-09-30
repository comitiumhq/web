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
import type { PendingInterviewEvent } from '@/lib/interviews/feedback';
import type { RuntimeStageActivity } from '@/lib/schemas/stage-activities';
import { isDefined } from '@/lib/utils';

import { getCandidateSheetEmptyActivityMessage } from '../model/candidate-sheet-action-state';

interface UseCandidateActivitiesModelParams {
  applicationId: string | null;
  actionState: CandidateSheetActionState;
  stageActivities: RuntimeStageActivity[];
  currentActivities: CandidateSheetCurrentActivity[];
}

export interface ActivitySourceIssue {
  key: 'interviews';
  message: string;
  onRetry: () => void;
}

export function useCandidateActivitiesModel({
  applicationId,
  actionState,
  stageActivities,
  currentActivities,
}: UseCandidateActivitiesModelParams) {
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
      activities: stageActivities,
      currentActivityById,
    });
  }, [isCurrentWorkBlocked, stageActivities, currentActivityById]);

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

  const handleRetryInterviews = useCallback(() => {
    interviewsQuery.refetch();
  }, [interviewsQuery.refetch]);

  const handleLoadMoreInterviews = useCallback(() => {
    interviewsQuery.fetchNextPage();
  }, [interviewsQuery.fetchNextPage]);

  const isActivitiesLoading = !isCurrentWorkBlocked && interviewsQuery.isLoading;

  const sourceIssues = [
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
  activities: RuntimeStageActivity[];
  currentActivityById: Map<string, CandidateSheetCurrentActivity>;
}

export function getPendingActivities({ activities, currentActivityById }: GetPendingActivitiesParams) {
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
  activities: RuntimeStageActivity[],
  nextAction: CandidateSheetNextAction | null,
): RuntimeStageActivity | null {
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
