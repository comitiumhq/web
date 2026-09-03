import { Button } from '@comitium/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
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
      <Card size="sm" className="gap-0 py-0">
        <CardHeader className="items-center border-b py-3">
          <CardTitle className="text-label-14 font-medium">{stage.name}</CardTitle>
          {canManage && canAddAnyActivity ? (
            <CardAction className="self-center">
              <Button variant="ghost" size="sm" onClick={handleOpenAdd} aria-label={`Add activity to ${stage.name}`}>
                <PlusIcon data-icon="inline-start" />
                Add
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>

        <CardContent className="py-2">
          {activities.length > 0 ? (
            <DragDropProvider onDragEnd={handleDragEnd}>
              <div className="divide-y divide-border">
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
            <p className="py-4 text-copy-14 text-muted-foreground">No activities</p>
          )}
        </CardContent>
      </Card>

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
