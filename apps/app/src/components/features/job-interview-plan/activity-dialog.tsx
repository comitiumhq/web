import { ORG_DEFAULT_FORM_VALUE } from '@comitium/schemas/forms/form-definitions';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Spinner } from '@comitium/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useCreateOwnerActivity, useUpdateOwnerActivity } from '@/hooks/mutations/use-stage-activity-mutations';
import type { StageType } from '@/lib/schemas/pipeline';
import {
  type ActivityEmailTemplateOption,
  type ActivityFeedbackFormOption,
  type ActivityInterviewTemplateOption,
  type ActivityMemberOption,
  type ActivityType,
  ALLOWED_ACTIVITIES_BY_STAGE_TYPE,
  type CreateStageActivityBody,
  type StageActivity,
  type StageActivityOwner,
} from '@/lib/schemas/stage-activities';

import {
  ApplicationReviewActivityForm,
  ScheduleInterviewActivityForm,
  SendEmailActivityForm,
} from './activity-dialog-forms';
import {
  type ApplicationReviewFormData,
  applicationReviewSchema,
  type ScheduleInterviewFormData,
  type SendEmailFormData,
  scheduleInterviewSchema,
  sendEmailSchema,
} from './activity-dialog-schema';
import type { ActivityTemplateOption } from './activity-template-field';

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageId: string;
  stageType: StageType;
  owner: StageActivityOwner;
  interviewTemplates: ActivityInterviewTemplateOption[];
  emailTemplates: ActivityEmailTemplateOption[];
  feedbackForms: ActivityFeedbackFormOption[];
  members: ActivityMemberOption[];
  activity?: StageActivity | null;
  hasApplicationReview?: boolean;
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  schedule_interview: 'Schedule interview',
  send_email: 'Send email',
  application_review: 'Application review',
};

function getSubmitLabel(isEdit: boolean, isPending: boolean): string {
  if (isEdit) {
    return isPending ? 'Saving...' : 'Save changes';
  }

  return isPending ? 'Adding...' : 'Add activity';
}

export function ActivityDialog({
  open,
  onOpenChange,
  stageId,
  stageType,
  owner,
  interviewTemplates,
  emailTemplates,
  feedbackForms,
  members,
  activity,
  hasApplicationReview = false,
}: ActivityDialogProps) {
  const isEdit = activity != null;
  const { mutate: createActivity, isPending: isCreating } = useCreateOwnerActivity();
  const { mutate: updateActivity, isPending: isUpdating } = useUpdateOwnerActivity();
  const isPending = isCreating || isUpdating;

  const availableActivityTypes = useMemo(
    () =>
      ALLOWED_ACTIVITIES_BY_STAGE_TYPE[stageType].filter(
        (type) => isEdit || type !== 'application_review' || !hasApplicationReview,
      ),
    [stageType, isEdit, hasApplicationReview],
  );
  const [activityType, setActivityType] = useState<ActivityType>(
    activity?.activityType ?? availableActivityTypes[0] ?? 'send_email',
  );

  const scheduleForm = useForm<ScheduleInterviewFormData>({
    resolver: zodResolver(scheduleInterviewSchema),
    defaultValues: { interviewId: '', defaultInterviewerUserIds: [] },
  });

  const emailForm = useForm<SendEmailFormData>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: { emailTemplateId: '' },
  });

  const reviewForm = useForm<ApplicationReviewFormData>({
    resolver: zodResolver(applicationReviewSchema),
    defaultValues: { reviewerUserIds: [], feedbackFormId: ORG_DEFAULT_FORM_VALUE },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setActivityType(activity?.activityType ?? availableActivityTypes[0] ?? 'send_email');

    scheduleForm.reset(
      activity?.activityType === 'schedule_interview'
        ? {
            interviewId: activity.interviewId,
            defaultInterviewerUserIds: (activity.defaultInterviewers ?? []).map((interviewer) => interviewer.userId),
          }
        : { interviewId: '', defaultInterviewerUserIds: [] },
    );

    emailForm.reset(
      activity?.activityType === 'send_email' ? { emailTemplateId: activity.emailTemplateId } : { emailTemplateId: '' },
    );

    reviewForm.reset(
      activity?.activityType === 'application_review'
        ? {
            reviewerUserIds: activity.reviewers.map((reviewer) => reviewer.userId),
            feedbackFormId: activity.feedbackFormId ?? ORG_DEFAULT_FORM_VALUE,
          }
        : { reviewerUserIds: [], feedbackFormId: ORG_DEFAULT_FORM_VALUE },
    );
  }, [open, activity, availableActivityTypes, scheduleForm, emailForm, reviewForm]);

  const submitActivity = useCallback(
    (body: CreateStageActivityBody) => {
      if (isEdit && activity) {
        updateActivity(
          { owner, activityId: activity.id, body },
          {
            onSuccess: () => {
              toast.success('Activity updated');
              onOpenChange(false);
            },
          },
        );

        return;
      }

      createActivity({ owner, stageId, body }, { onSuccess: () => onOpenChange(false) });
    },
    [isEdit, activity, owner, stageId, createActivity, updateActivity, onOpenChange],
  );

  const handleSubmitSchedule = useCallback(
    (data: ScheduleInterviewFormData) => {
      const existingRoles = new Map(
        activity?.activityType === 'schedule_interview'
          ? (activity.defaultInterviewers ?? []).map((interviewer) => [interviewer.userId, interviewer.role])
          : [],
      );
      const defaultInterviewers =
        data.defaultInterviewerUserIds.length === 0
          ? null
          : data.defaultInterviewerUserIds.map((userId) => ({
              userId,
              role: existingRoles.get(userId) ?? 'interviewer',
            }));

      submitActivity({
        activityType: 'schedule_interview',
        interviewId: data.interviewId,
        defaultInterviewers,
      });
    },
    [activity, submitActivity],
  );

  const handleSubmitEmail = useCallback(
    (data: SendEmailFormData) => {
      submitActivity({ activityType: 'send_email', emailTemplateId: data.emailTemplateId });
    },
    [submitActivity],
  );

  const handleSubmitReview = useCallback(
    (data: ApplicationReviewFormData) => {
      submitActivity({
        activityType: 'application_review',
        reviewers: data.reviewerUserIds.map((userId) => ({ userId })),
        feedbackFormId: data.feedbackFormId === ORG_DEFAULT_FORM_VALUE ? null : data.feedbackFormId,
      });
    },
    [submitActivity],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleTabChange = useCallback((value: string) => {
    setActivityType(value as ActivityType);
  }, []);

  const interviewItems: ActivityTemplateOption[] = interviewTemplates.map((template) => ({
    id: template.id,
    label: `${template.title} (${template.durationMinutes} min)`,
  }));

  const emailItems: ActivityTemplateOption[] = emailTemplates.map((template) => ({
    id: template.id,
    label: template.name,
  }));

  const feedbackFormItems: ActivityTemplateOption[] = feedbackForms.map((form) => ({
    id: form.id,
    label: form.isDefaultForm ? `${form.title} (org default)` : form.title,
  }));

  const title = isEdit ? 'Edit activity' : 'Add activity';
  const description = isEdit
    ? 'Update the activity configuration for this stage.'
    : 'Pick an activity type and configure it for this stage.';

  const footer = (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending && <Spinner data-icon="inline-start" />}
        {getSubmitLabel(isEdit, isPending)}
      </Button>
    </DialogFooter>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!isEdit && availableActivityTypes.length > 1 && (
          <Tabs value={activityType} onValueChange={handleTabChange}>
            <TabsList
              className="grid w-full"
              style={{ gridTemplateColumns: `repeat(${availableActivityTypes.length}, 1fr)` }}
            >
              {availableActivityTypes.map((type) => (
                <TabsTrigger key={type} value={type} className="text-xs">
                  {ACTIVITY_TYPE_LABELS[type]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {activityType === 'schedule_interview' ? (
          <ScheduleInterviewActivityForm
            form={scheduleForm}
            onSubmit={handleSubmitSchedule}
            interviewItems={interviewItems}
            members={members}
            footer={footer}
          />
        ) : null}

        {activityType === 'send_email' ? (
          <SendEmailActivityForm
            form={emailForm}
            onSubmit={handleSubmitEmail}
            emailItems={emailItems}
            footer={footer}
          />
        ) : null}

        {activityType === 'application_review' ? (
          <ApplicationReviewActivityForm
            form={reviewForm}
            onSubmit={handleSubmitReview}
            feedbackFormItems={feedbackFormItems}
            members={members}
            footer={footer}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
