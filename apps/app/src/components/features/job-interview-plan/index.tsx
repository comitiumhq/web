import { EmptyState } from '@comitium/ui/empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useMemo } from 'react';
import { useQueryInterviewPlan } from '@/hooks/queries/use-query-interview-plan';
import { useQueryInterviewPlans } from '@/hooks/queries/use-query-interview-plans';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useQueryPipeline } from '@/hooks/queries/use-query-pipeline';
import { useQueryOwnerActivities, useQueryOwnerActivityOptions } from '@/hooks/queries/use-query-stage-activities';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { usePermissions } from '@/hooks/use-permissions';
import { isJobConfigurationReadOnly } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';
import type { StageActivityOwner } from '@/lib/schemas/stage-activities';

import { InterviewPlanEditorView } from './editor-view';

interface DraftPlanControl {
  selectedPlanId: string | null;
  onSelectPlan: (planId: string | null) => void;
  isSaving: boolean;
}

interface JobInterviewPlanProps {
  org: MyOrg;
  jobId: string;
  draftPlan?: DraftPlanControl;
}

function InterviewPlanSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-28 w-full rounded-2xl" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function JobInterviewPlan({ org, jobId, draftPlan }: JobInterviewPlanProps) {
  const { data: jobSummary, isLoading: summaryLoading, error: summaryError } = useQueryJobSummary(jobId);
  const selectedPlanId = draftPlan?.selectedPlanId ?? jobSummary?.interviewPlanId ?? null;
  const owner = useMemo<StageActivityOwner>(() => ({ kind: 'job', jobId }), [jobId]);
  const { canOnJob, isLoading: permissionsLoading } = useJobPermissions(jobId);
  const { can } = usePermissions();
  const canReadPlanLibrary = can(Permission.INTERVIEW_PLAN_READ);
  const shouldReadLibraryPlan = canReadPlanLibrary && selectedPlanId !== null;
  const {
    data: planData,
    isLoading: planLoading,
    error: planError,
  } = useQueryInterviewPlan(
    shouldReadLibraryPlan ? org.id : undefined,
    shouldReadLibraryPlan ? (selectedPlanId ?? undefined) : undefined,
  );
  const {
    data: pipelineData,
    isLoading: pipelineLoading,
    error: pipelineError,
  } = useQueryPipeline(!shouldReadLibraryPlan && selectedPlanId !== null ? jobId : null);
  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useQueryOwnerActivities(selectedPlanId === null ? null : owner);
  const isReadOnly = isJobConfigurationReadOnly(jobSummary?.status ?? null);
  const hasUnsavedPlanSelection = Boolean(draftPlan && selectedPlanId !== jobSummary?.interviewPlanId);
  const canManageActivities =
    canOnJob(Permission.INTERVIEW_WRITE) && !isReadOnly && !hasUnsavedPlanSelection && !draftPlan?.isSaving;
  const {
    data: activityOptionsData,
    isLoading: activityOptionsLoading,
    error: activityOptionsError,
  } = useQueryOwnerActivityOptions(canManageActivities && selectedPlanId !== null ? owner : null);
  const {
    data: plansData,
    isLoading: plansLoading,
    error: plansError,
  } = useQueryInterviewPlans(draftPlan && canReadPlanLibrary ? org.id : undefined);

  const stages = useMemo(() => {
    const sourceStages = shouldReadLibraryPlan ? planData?.data.stages : pipelineData?.stages;

    return [...(sourceStages ?? [])].sort((first, second) => first.stageOrder - second.stageOrder);
  }, [pipelineData?.stages, planData?.data.stages, shouldReadLibraryPlan]);
  const plans = plansData?.data ?? [];
  const activities = activitiesData?.data ?? [];
  const selectedPlanLoading = shouldReadLibraryPlan ? planLoading : pipelineLoading;
  const selectedPlanError = shouldReadLibraryPlan ? planError : pipelineError;
  const isLoading =
    summaryLoading ||
    permissionsLoading ||
    (selectedPlanId !== null && (selectedPlanLoading || activitiesLoading || activityOptionsLoading));
  const error = summaryError || selectedPlanError || activitiesError || activityOptionsError;
  const isRefreshingPlan = Boolean(draftPlan?.isSaving && hasUnsavedPlanSelection);
  const selectedPlanName = shouldReadLibraryPlan ? planData?.data.name : pipelineData?.pipeline.name;

  const handlePlanChange = useCallback(
    (planId: string) => {
      draftPlan?.onSelectPlan(planId);
    },
    [draftPlan],
  );

  if (isLoading) {
    return <InterviewPlanSkeleton />;
  }

  if (error || !jobSummary) {
    return (
      <EmptyState
        icon={WarningCircleIcon}
        title="Failed to load interview plan"
        description="Refresh the page and try again."
      />
    );
  }

  return (
    <InterviewPlanEditorView
      owner={owner}
      scope="job"
      selectedPlanId={selectedPlanId}
      selectedPlanName={selectedPlanName ?? null}
      plans={plans}
      stages={stages}
      activities={activities}
      interviewTemplates={activityOptionsData?.data.interviewTemplates ?? []}
      emailTemplates={activityOptionsData?.data.emailTemplates ?? []}
      feedbackForms={activityOptionsData?.data.feedbackForms ?? []}
      members={activityOptionsData?.data.members ?? []}
      canSelectPlan={draftPlan !== undefined && canReadPlanLibrary}
      canManageActivities={canManageActivities}
      planControlDisabled={plansLoading || draftPlan?.isSaving}
      plansUnavailable={Boolean(plansError)}
      isRefreshingPlan={isRefreshingPlan}
      onSelectPlan={handlePlanChange}
    />
  );
}
