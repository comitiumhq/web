import { ORG_DEFAULT_FORM_VALUE } from '@comitium/schemas/forms/form-definitions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { InfoIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { SubmitHandler, UseFormReturn } from 'react-hook-form';
import { MemberOptionsMultiSelect } from '@/components/features/team-management/members/members-multi-select';
import type { ActivityMemberOption } from '@/lib/schemas/stage-activities';

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
  feedbackFormItems: ActivityTemplateOption[];
  members: ActivityMemberOption[];
  footer: ReactNode;
}

export function ApplicationReviewActivityForm({
  form,
  onSubmit,
  feedbackFormItems,
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
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ORG_DEFAULT_FORM_VALUE}>Use org default</SelectItem>
                  {feedbackFormItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {footer}
      </form>
    </Form>
  );
}
