import { EmptyState } from '@comitium/ui/empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUpdateJobTemplate } from '@/hooks/mutations/use-job-template-mutations';
import { useQueryInterviewPlan } from '@/hooks/queries/use-query-interview-plan';
import { useQueryInterviewPlans } from '@/hooks/queries/use-query-interview-plans';
import { useQueryOwnerActivities, useQueryOwnerActivityOptions } from '@/hooks/queries/use-query-stage-activities';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@/lib/schemas/org';
import type { StageActivityOwner } from '@/lib/schemas/stage-activities';

import { InterviewPlanEditorView } from './editor-view';

interface TemplateInterviewPlanProps {
  orgId: string;
  templateId: string;
  selectedPlanId: string | null;
  isArchived: boolean;
}

export function TemplateInterviewPlan({ orgId, templateId, selectedPlanId, isArchived }: TemplateInterviewPlanProps) {
  const [localPlanId, setLocalPlanId] = useState(selectedPlanId);
  const owner = useMemo<StageActivityOwner>(() => ({ kind: 'jobTemplate', orgId, templateId }), [orgId, templateId]);
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
  } = useQueryOwnerActivities(localPlanId === null ? null : owner);
  const updateTemplate = useUpdateJobTemplate();
  const { can } = usePermissions();
  const canManage = can(Permission.JOB_TEMPLATE_WRITE) && !isArchived;
  const {
    data: activityOptionsData,
    isLoading: activityOptionsLoading,
    error: activityOptionsError,
  } = useQueryOwnerActivityOptions(canManage && localPlanId !== null ? owner : null);

  useEffect(() => {
    setLocalPlanId(selectedPlanId);
  }, [selectedPlanId]);

  const stages = useMemo(
    () => [...(planData?.data.stages ?? [])].sort((first, second) => first.stageOrder - second.stageOrder),
    [planData?.data.stages],
  );
  const handlePlanChange = useCallback(
    (planId: string) => {
      const previousPlanId = localPlanId;
      setLocalPlanId(planId);
      updateTemplate.mutate(
        { orgId, templateId, body: { interviewPlanId: planId } },
        {
          onError: () => {
            setLocalPlanId(previousPlanId);
          },
        },
      );
    },
    [localPlanId, orgId, templateId, updateTemplate],
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
        icon={WarningCircleIcon}
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
      canManageActivities={canManage}
      planControlDisabled={updateTemplate.isPending}
      plansUnavailable={Boolean(plansError)}
      isRefreshingPlan={updateTemplate.isPending}
      onSelectPlan={handlePlanChange}
    />
  );
}
