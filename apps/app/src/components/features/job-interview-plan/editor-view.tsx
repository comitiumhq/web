import { Card, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
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
    return 'Stages come from the shared plan. Activities are copied to jobs created from this template.';
  }

  return 'Stages come from the shared plan. Activities apply only to this job.';
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
      <Card size="sm" className="gap-0 py-0">
        <CardHeader className="gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              {selectedPlanName ? (
                <span className="shrink-0 text-label-12 text-muted-foreground">Shared plan</span>
              ) : null}
              <CardTitle className="truncate">{selectedPlanName ?? 'No interview plan selected'}</CardTitle>
            </div>
            <CardDescription className="mt-1">{scopeDescription(scope)}</CardDescription>
          </div>
          <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-self-end">
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
        </CardHeader>
      </Card>

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
