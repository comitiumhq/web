import { Form, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { InfoIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { SubmitHandler, UseFormReturn } from 'react-hook-form';
import { FeedbackFormSelect } from '@/components/features/form-builder/feedback-form-select';
import { MemberOptionsMultiSelect } from '@/components/features/team-management/members/members-multi-select';
import type { ActivityFeedbackFormOption, ActivityMemberOption } from '@/lib/schemas/stage-activities';

import type { ApplicationReviewFormData, ScheduleInterviewFormData, SendEmailFormData } from './activity-dialog-schema';
import { ActivityTemplateField, type ActivityTemplateOption } from './activity-template-field';

interface ScheduleInterviewActivityFormProps {
  form: UseFormReturn<ScheduleInterviewFormData>;
  onSubmit: SubmitHandler<ScheduleInterviewFormData>;
  interviewItems: ActivityTemplateOption[];
  members: ActivityMemberOption[];
  footer: ReactNode;
}

export function ScheduleInterviewActivityForm({
  form,
  onSubmit,
  interviewItems,
  members,
  footer,
}: ScheduleInterviewActivityFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <ActivityTemplateField
          control={form.control}
          name="interviewId"
          label="Interview template"
          items={interviewItems}
        />

        <FormField
          control={form.control}
          name="defaultInterviewerUserIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default interviewers</FormLabel>
              <MemberOptionsMultiSelect
                members={members}
                selectedUserIds={field.value}
                onChange={field.onChange}
                placeholder="Add interviewer"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {footer}
      </form>
    </Form>
  );
}

interface SendEmailActivityFormProps {
  form: UseFormReturn<SendEmailFormData>;
  onSubmit: SubmitHandler<SendEmailFormData>;
  emailItems: ActivityTemplateOption[];
  footer: ReactNode;
}

export function SendEmailActivityForm({ form, onSubmit, emailItems, footer }: SendEmailActivityFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <ActivityTemplateField
          control={form.control}
          name="emailTemplateId"
          label="Email template"
          items={emailItems}
        />

        {footer}
      </form>
    </Form>
  );
}

interface ApplicationReviewActivityFormProps {
  form: UseFormReturn<ApplicationReviewFormData>;
  onSubmit: SubmitHandler<ApplicationReviewFormData>;
  feedbackForms: ActivityFeedbackFormOption[];
  members: ActivityMemberOption[];
  footer: ReactNode;
}

export function ApplicationReviewActivityForm({
  form,
  onSubmit,
  feedbackForms,
  members,
  footer,
}: ApplicationReviewActivityFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="reviewerUserIds"
          render={({ field }) => (
            <FormItem>
              <div className="grid grid-cols-[max-content_1fr] items-center gap-x-1.5 gap-y-2">
                <FormLabel className="col-start-1 row-start-1">Reviewers</FormLabel>
                <div className="col-span-2 row-start-2">
                  <MemberOptionsMultiSelect
                    members={members}
                    selectedUserIds={field.value}
                    onChange={field.onChange}
                    placeholder="Add reviewer"
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="About reviewer selection"
                      className="col-start-2 row-start-1 inline-flex size-4 items-center justify-center justify-self-start rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <InfoIcon className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    Leave empty so anyone in the hiring team can review. Add reviewers to require specific decisions.
                  </TooltipContent>
                </Tooltip>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="feedbackFormId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feedback form</FormLabel>
              <FeedbackFormSelect value={field.value} onValueChange={field.onChange} forms={feedbackForms} />
              <FormMessage />
            </FormItem>
          )}
        />

        {footer}
      </form>
    </Form>
  );
}
