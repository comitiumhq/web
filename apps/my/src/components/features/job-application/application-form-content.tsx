import type { CareerJob } from '@comitium/jobs/schemas';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Form } from '@comitium/ui/form';
import { Spinner } from '@comitium/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { FormRenderer } from '@/components/features/form-runtime';
import { ApplicationPrivacyNotice } from './application-privacy-notice';
import { ApplicationSuccess } from './application-success';
import type { ApplicationFormController } from './use-application-form';

interface ApplicationFormContentProps {
  applyForm: NestedForm;
  company: string;
  controller: ApplicationFormController;
  isPending: boolean;
  jobTitle: string;
  onSubmit: (data: Record<string, unknown>) => void;
  pendingLabel: string;
  policy: CareerJob['recruitingPrivacy'];
  primaryDisabled: boolean;
  primaryLabel: string;
  primaryTooltip?: ReactNode;
  secondaryStatus?: ReactNode;
}

export function ApplicationFormContent({
  applyForm,
  company,
  controller,
  isPending,
  jobTitle,
  onSubmit,
  pendingLabel,
  policy,
  primaryDisabled,
  primaryLabel,
  primaryTooltip,
  secondaryStatus,
}: ApplicationFormContentProps) {
  const {
    applicationFormRef,
    clearValidationSummary,
    form,
    handleFormBlur,
    handleFormInvalid,
    handleValidationIssueClick,
    isApplicationSubmitted,
    privacyNoticeProps,
    validationIssues,
    validationSummaryRef,
  } = controller;

  if (isApplicationSubmitted) {
    return <ApplicationSuccess jobTitle={jobTitle} company={company} />;
  }

  const hasPrimaryTooltip = primaryTooltip !== undefined;
  const isPrimaryUnavailable = primaryDisabled && hasPrimaryTooltip;
  const primaryAction = (
    <Button
      type={isPrimaryUnavailable ? 'button' : 'submit'}
      className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-primary"
      size="lg"
      disabled={primaryDisabled && !isPrimaryUnavailable}
      aria-disabled={isPrimaryUnavailable || undefined}
    >
      {isPending && <Spinner data-icon="inline-start" />}
      {isPending ? pendingLabel : primaryLabel}
    </Button>
  );

  return (
    <>
      <Form {...form}>
        <form
          ref={applicationFormRef}
          onSubmit={form.handleSubmit(onSubmit, handleFormInvalid)}
          onBlurCapture={handleFormBlur}
          className="flex flex-col gap-6"
        >
          {validationIssues.length > 0 && (
            <Alert ref={validationSummaryRef} variant="destructive" aria-live="assertive" tabIndex={-1}>
              <WarningCircleIcon />
              <AlertTitle>Your form needs corrections</AlertTitle>
              <AlertAction>
                <button
                  type="button"
                  aria-label="Dismiss validation errors"
                  className="cursor-pointer rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={clearValidationSummary}
                >
                  <XIcon className="size-4" />
                </button>
              </AlertAction>
              <AlertDescription>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {validationIssues.map((issue) => (
                    <li key={issue.questionId}>
                      <button
                        type="button"
                        className="cursor-pointer underline underline-offset-2 hover:opacity-80"
                        onClick={() => handleValidationIssueClick(issue.questionId)}
                      >
                        {issue.label}
                      </button>
                      <span>: {issue.message}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <FormRenderer form={applyForm} control={form.control} variant="application" />

          {primaryTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>{primaryAction}</TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-80 flex-col items-start">
                {primaryTooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            primaryAction
          )}

          {secondaryStatus}
        </form>
      </Form>

      <ApplicationPrivacyNotice policy={policy} {...privacyNoticeProps} />
    </>
  );
}
