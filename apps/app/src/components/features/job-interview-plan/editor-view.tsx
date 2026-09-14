import { Badge } from '@comitium/ui/badge';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { Skeleton } from '@comitium/ui/skeleton';
import { useCallback, useMemo, useState } from 'react';
import type { InterviewPlanSummary, InterviewStage } from '@/lib/schemas/pipeline';
import type {
  ActivityEmailTemplateOption,
  ActivityFeedbackFormOption,
  ActivityInterviewTemplateOption,
  ActivityMemberOption,
  StageActivity,
  StageActivityOwner,
} from '@/lib/schemas/stage-activities';

import { PlanPickerDialog } from './plan-picker-dialog';
import { StageSection } from './stage-section';

interface InterviewPlanEditorViewProps {
  owner: StageActivityOwner;
  scope: 'job' | 'template';
  selectedPlanId: string | null;
  selectedPlanName: string | null;
  plans: InterviewPlanSummary[];
  stages: InterviewStage[];
  activities: StageActivity[];
  interviewTemplates: ActivityInterviewTemplateOption[];
  emailTemplates: ActivityEmailTemplateOption[];
  feedbackForms: ActivityFeedbackFormOption[];
  members: ActivityMemberOption[];
  canSelectPlan: boolean;
  canManageActivities: boolean;
  planControlDisabled?: boolean;
  plansUnavailable?: boolean;
  isRefreshingPlan?: boolean;
  onSelectPlan: (planId: string) => void;
}

function isDefaultReviewActivity(activity: StageActivity, stages: InterviewStage[]): boolean {
  const stage = stages.find((candidate) => candidate.id === activity.stageId);

  return (
    stage?.stageType === 'review' &&
    activity.activityType === 'application_review' &&
    activity.reviewers.length === 0 &&
    activity.feedbackFormId === null
  );
}

function scopeDescription(scope: InterviewPlanEditorViewProps['scope']): string {
  if (scope === 'template') {
    return 'Stages stay synced with this plan. Activities are copied to new jobs.';
  }

  return 'Stages stay synced with this plan. Activities apply only to this job.';
}

export function InterviewPlanEditorView({
  owner,
  scope,
  selectedPlanId,
  selectedPlanName,
  plans,
  stages,
  activities,
  interviewTemplates,
  emailTemplates,
  feedbackForms,
  members,
  canSelectPlan,
  canManageActivities,
  planControlDisabled = false,
  plansUnavailable = false,
  isRefreshingPlan = false,
  onSelectPlan,
}: InterviewPlanEditorViewProps) {
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const activitiesByStage = useMemo(() => {
    const map = new Map<string, StageActivity[]>();

    for (const activity of activities) {
      const existing = map.get(activity.stageId) ?? [];
      existing.push(activity);
      map.set(activity.stageId, existing);
    }

    for (const [stageId, group] of map) {
      map.set(
        stageId,
        group.toSorted((first, second) => first.activityOrder - second.activityOrder),
      );
    }

    return map;
  }, [activities]);

  const hasConfiguredActivities = useMemo(
    () => activities.some((activity) => !isDefaultReviewActivity(activity, stages)),
    [activities, stages],
  );

  const pendingPlan = plans.find((plan) => plan.id === pendingPlanId);

  const handlePlanChange = useCallback(
    (planId: string) => {
      if (planId === selectedPlanId) {
        return;
      }

      if (hasConfiguredActivities) {
        setPendingPlanId(planId);
        return;
      }

      onSelectPlan(planId);
    },
    [hasConfiguredActivities, onSelectPlan, selectedPlanId],
  );

  const handleConfirmPlanChange = useCallback(() => {
    if (pendingPlanId === null) {
      return;
    }

    onSelectPlan(pendingPlanId);
    setPendingPlanId(null);
  }, [onSelectPlan, pendingPlanId]);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setPendingPlanId(null);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-heading-16">{selectedPlanName ?? 'No interview plan selected'}</h3>
            {selectedPlanName ? <Badge variant="subtle">Shared plan</Badge> : null}
          </div>
          <p className="mt-1 text-copy-13 text-muted-foreground">{scopeDescription(scope)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {plansUnavailable ? <span className="text-copy-13 text-destructive-text">Plans unavailable</span> : null}
          {canSelectPlan && !plansUnavailable ? (
            <PlanPickerDialog
              plans={plans}
              selectedPlanId={selectedPlanId}
              disabled={planControlDisabled}
              onSelect={handlePlanChange}
            />
          ) : null}
        </div>
      </div>

      {isRefreshingPlan ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        stages.map((stage) => (
          <StageSection
            key={stage.id}
            stage={stage}
            activities={activitiesByStage.get(stage.id) ?? []}
            interviewTemplates={interviewTemplates}
            emailTemplates={emailTemplates}
            feedbackForms={feedbackForms}
            members={members}
            owner={owner}
            canManage={canManageActivities}
          />
        ))
      )}

      <ConfirmDialog
        open={pendingPlanId !== null}
        onOpenChange={handleConfirmOpenChange}
        title="Switch interview plan?"
        description={`Switching to ${pendingPlan?.name ?? 'this plan'} removes the activities configured for this ${scope}. The shared interview plans will not change.`}
        actionLabel="Switch plan"
        onConfirm={handleConfirmPlanChange}
      />
    </div>
  );
}
