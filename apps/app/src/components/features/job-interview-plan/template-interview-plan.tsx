import { EmptyState } from '@comitium/ui/empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { CircleAlertIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useQueryInterviewPlan } from '@/hooks/queries/use-query-interview-plan';
import { useQueryInterviewPlans } from '@/hooks/queries/use-query-interview-plans';
import { useQueryOwnerActivities, useQueryOwnerActivityOptions } from '@/hooks/queries/use-query-stage-activities';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@/lib/schemas/org';
import type { StageActivityOwner } from '@/lib/schemas/stage-activities';
import { isDefined } from '@/lib/utils';

import { InterviewPlanEditorView } from './editor-view';

interface TemplateInterviewPlanProps {
  orgId: string;
  templateId: string;
  selectedPlanId: string | null;
  isArchived: boolean;
  savedPlanId: string | null;
  isSaving: boolean;
  onSelectPlan: (planId: string) => void;
}

export function TemplateInterviewPlan({
  orgId,
  templateId,
  selectedPlanId,
  isArchived,
  savedPlanId,
  isSaving,
  onSelectPlan,
}: TemplateInterviewPlanProps) {
  const localPlanId = selectedPlanId;
  const owner = useMemo<StageActivityOwner>(() => ({ kind: 'jobTemplate', orgId, templateId }), [orgId, templateId]);
  const isPlanSettled = !isSaving && localPlanId === savedPlanId;
  const canReadActivities = isDefined(selectedPlanId) && isPlanSettled;
  const { data: plansData, isLoading: plansLoading, error: plansError } = useQueryInterviewPlans(orgId);

  const {
    data: planData,
    isLoading: planLoading,
    error: planError,
  } = useQueryInterviewPlan(orgId, localPlanId ?? undefined);

  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useQueryOwnerActivities(canReadActivities ? owner : null);

  const { can } = usePermissions();
  const canManage = can(Permission.JOB_TEMPLATE_WRITE) && !isArchived;
  const canManageActivities = canManage && canReadActivities;
  const {
    data: activityOptionsData,
    isLoading: activityOptionsLoading,
    error: activityOptionsError,
  } = useQueryOwnerActivityOptions(canManageActivities ? owner : null);

  const stages = useMemo(
    () => [...(planData?.data.stages ?? [])].sort((first, second) => first.stageOrder - second.stageOrder),
    [planData?.data.stages],
  );

  if (plansLoading || (localPlanId !== null && (planLoading || activitiesLoading || activityOptionsLoading))) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (planError || activitiesError || activityOptionsError) {
    return (
      <EmptyState
        icon={CircleAlertIcon}
        title="Failed to load interview plan"
        description="Refresh the page and try again."
      />
    );
  }

  return (
    <InterviewPlanEditorView
      owner={owner}
      scope="template"
      selectedPlanId={localPlanId}
      selectedPlanName={planData?.data.name ?? null}
      plans={plansData?.data ?? []}
      stages={stages}
      activities={activitiesData?.data ?? []}
      interviewTemplates={activityOptionsData?.data.interviewTemplates ?? []}
      emailTemplates={activityOptionsData?.data.emailTemplates ?? []}
      feedbackForms={activityOptionsData?.data.feedbackForms ?? []}
      members={activityOptionsData?.data.members ?? []}
      canSelectPlan={canManage}
      canManageActivities={canManageActivities}
      planControlDisabled={isSaving}
      plansUnavailable={Boolean(plansError)}
      isRefreshingPlan={localPlanId !== savedPlanId && isSaving}
      onSelectPlan={onSelectPlan}
    />
  );
}
