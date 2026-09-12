import { Button } from '@comitium/ui/button';
import type { DragDropEventHandlers } from '@dnd-kit/react';
import { DragDropProvider } from '@dnd-kit/react';
import { PlusIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { useReorderOwnerActivities } from '@/hooks/mutations/use-stage-activity-mutations';
import type { StageType } from '@/lib/schemas/pipeline';
import {
  type ActivityEmailTemplateOption,
  type ActivityFeedbackFormOption,
  type ActivityInterviewTemplateOption,
  type ActivityMemberOption,
  ALLOWED_ACTIVITIES_BY_STAGE_TYPE,
  type StageActivity,
  type StageActivityOwner,
} from '@/lib/schemas/stage-activities';
import { applyDndReorder } from '@/lib/utils/dnd';

import { ActivityDialog } from './activity-dialog';
import { ActivityRow } from './activity-row';

interface StageSectionProps {
  stage: { id: string; name: string; stageOrder: number; stageType: StageType };
  activities: StageActivity[];
  interviewTemplates: ActivityInterviewTemplateOption[];
  emailTemplates: ActivityEmailTemplateOption[];
  feedbackForms: ActivityFeedbackFormOption[];
  members: ActivityMemberOption[];
  owner: StageActivityOwner;
  canManage: boolean;
}

export function StageSection({
  stage,
  activities,
  interviewTemplates,
  emailTemplates,
  feedbackForms,
  members,
  owner,
  canManage,
}: StageSectionProps) {
  const isReviewStage = stage.stageType === 'review';
  const canAddAnyActivity = ALLOWED_ACTIVITIES_BY_STAGE_TYPE[stage.stageType].length > 0;
  const [addOpen, setAddOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<StageActivity | null>(null);
  const { mutate: reorderActivities } = useReorderOwnerActivities();
  const dialogOpen = addOpen || editingActivity !== null;
  const hasApplicationReview = activities.some((activity) => activity.activityType === 'application_review');
  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);

  const handleOpenAdd = useCallback(() => {
    setAddOpen(true);
  }, []);

  const handleEdit = useCallback((activity: StageActivity) => {
    setEditingActivity(activity);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      return;
    }

    setAddOpen(false);
    setEditingActivity(null);
  }, []);

  const handleDragEnd = useCallback<DragDropEventHandlers['onDragEnd']>(
    (event) => {
      if (event.canceled) {
        return;
      }

      const reordered = applyDndReorder(
        activities,
        (activity) => activity.id,
        event.operation.source,
        event.operation.target,
      );

      if (!reordered) {
        return;
      }

      reorderActivities({ owner, stageId: stage.id, activityIds: reordered.map((activity) => activity.id) });
    },
    [activities, owner, reorderActivities, stage.id],
  );

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card bg-clip-padding">
        <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-1">
          <h3 className="truncate text-label-14 font-medium">{stage.name}</h3>
          {canManage && canAddAnyActivity ? (
            <Button variant="ghost" size="sm" onClick={handleOpenAdd} aria-label={`Add activity to ${stage.name}`}>
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
          ) : null}
        </header>

        <div className="px-2 pb-2">
          {activities.length > 0 ? (
            <DragDropProvider onDragEnd={handleDragEnd}>
              <div className="flex flex-col gap-1">
                {activities.map((activity, index) => (
                  <ActivityRow
                    key={activity.id}
                    activity={activity}
                    owner={owner}
                    memberMap={memberMap}
                    canManage={canManage}
                    isReviewStage={isReviewStage}
                    index={index}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </DragDropProvider>
          ) : (
            <p className="px-2 py-3 text-copy-14 text-muted-foreground">No activities</p>
          )}
        </div>
      </section>

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        stageId={stage.id}
        stageType={stage.stageType}
        owner={owner}
        interviewTemplates={interviewTemplates}
        emailTemplates={emailTemplates}
        feedbackForms={feedbackForms}
        members={members}
        activity={editingActivity}
        hasApplicationReview={hasApplicationReview}
      />
    </>
  );
}
