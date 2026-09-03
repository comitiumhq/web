import { useSession } from '@comitium/auth/use-session';
import { useAccount } from '@comitium/auth/use-wallet';
import { fetchApplicantStakeAmount } from '@comitium/chain/job-config';
import type { CareerJob } from '@comitium/jobs/schemas';
import { STALE_TIME_SHORT, shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import { orderApplicationRequiredQuestionsFirst } from '@comitium/schemas/forms/application-required-fields';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { ActionConfirmationNotice, BACKGROUND_CONFIRMATION_COPY } from '@comitium/ui/action-confirmation';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { Form } from '@comitium/ui/form';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignInIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { buildDefaultValues, buildFormSchema, FormRenderer } from '@/components/features/form-runtime';
import { useApplyJob } from '@/hooks/mutations/use-apply-job';
import { qk } from '@/hooks/query-keys';
import { extractApplicationSubmission, resolveAiCriteriaEvaluationChoice } from '@/lib/forms/application-submission';
import {
  clearApplicationDraft,
  createApplicationDraftKey,
  readApplicationDraft,
  writeApplicationDraft,
} from './application-draft-cache';
import { ApplicationPrivacyNotice } from './application-privacy-notice';
import { ApplicationSuccess } from './application-success';
import { ConfirmDialog } from './confirm-dialog';

interface ApplicationFormProps {
  applyForm: NestedForm;
  jobData: JobApplicationData;
  jobTitle: string;
  company: string;
  responseDeadlineDays: number;
  policy: CareerJob['recruitingPrivacy'];
  onSuccess?: () => void;
}

interface AuthenticatedApplicationFormProps extends ApplicationFormProps {
  accountId: string;
}

interface ApplicationValidationIssue {
  questionId: string;
  label: string;
  message: string;
}

function primaryPendingLabelFor(stakeLoading: boolean): string {
  if (stakeLoading) {
    return 'Loading current deposit...';
  }

  return 'Submitting...';
}

function primaryLabelFor(isConfirming: boolean): string {
  if (isConfirming) {
    return BACKGROUND_CONFIRMATION_COPY.actionLabel;
  }

  return 'Continue';
}

function AuthenticatedApplicationForm({
  accountId,
  applyForm,
  jobData,
  jobTitle,
  company,
  responseDeadlineDays,
  policy,
  onSuccess,
}: AuthenticatedApplicationFormProps) {
  const { address, isConnected } = useAccount();
  const stakeQuery = useQuery({
    queryKey: qk.application.applicantStake(jobData.commitmentContract),
    queryFn: () => fetchApplicantStakeAmount(jobData.commitmentContract),
    retry: shouldRetryQuery,
    staleTime: STALE_TIME_SHORT,
  });
  const stakeAmount = stakeQuery.data ?? null;

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<Record<string, unknown> | null>(null);
  const [aiCriteriaEvaluationOptOut, setAiCriteriaEvaluationOptOut] = useState(false);
  const [isApplicationSubmitted, setIsApplicationSubmitted] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ApplicationValidationIssue[]>([]);
  const applicationFormRef = useRef<HTMLFormElement>(null);
  const validationSummaryRef = useRef<HTMLDivElement>(null);
  const validationSummaryVisibleRef = useRef(false);
  const editedSinceReviewRef = useRef(false);

  const schema = useMemo(() => buildFormSchema(applyForm), [applyForm]);
  const aiCriteriaEvaluation = resolveAiCriteriaEvaluationChoice(
    applyForm,
    policy.aiCriteriaEvaluation.enabled,
    aiCriteriaEvaluationOptOut,
  );
  const draftKey = useMemo(
    () => createApplicationDraftKey(accountId, jobData.postingId, applyForm.form.id),
    [accountId, jobData.postingId, applyForm.form.id],
  );

  const defaultValues = useMemo(
    () => ({
      ...buildDefaultValues(applyForm),
      ...readApplicationDraft(draftKey, applyForm),
    }),
    [applyForm, draftKey],
  );

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues,
    reValidateMode: 'onSubmit',
  });

  useEffect(() => {
    setAiCriteriaEvaluationOptOut(false);
  }, [aiCriteriaEvaluation.showCriteriaEvaluation, jobData.postingId]);

  const clearValidationSummary = useCallback(() => {
    validationSummaryVisibleRef.current = false;
    editedSinceReviewRef.current = false;
    setValidationIssues([]);
  }, []);

  const handleFormInvalid = useCallback(() => {
    const issues = applyForm.sections.flatMap((section) =>
      orderApplicationRequiredQuestionsFirst(section.questions).flatMap((question) => {
        const message = form.getFieldState(question.id).error?.message;

        if (!message) {
          return [];
        }

        return [{ questionId: question.id, label: question.prompt, message }];
      }),
    );

    if (issues.length === 0) {
      return;
    }

    validationSummaryVisibleRef.current = true;
    editedSinceReviewRef.current = false;
    setValidationIssues(issues);
    form.clearErrors();
  }, [applyForm.sections, form]);

  const handleValidationIssueClick = useCallback((questionId: string) => {
    const questions = applicationFormRef.current?.querySelectorAll<HTMLElement>('[data-form-question-id]');
    const question = Array.from(questions ?? []).find((element) => element.dataset.formQuestionId === questionId);
    const control = question?.querySelector<HTMLElement>('[data-form-focus-target]');

    if (!control) {
      return;
    }

    control.focus({ preventScroll: true });
    control.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleFormBlur = useCallback(() => {
    if (!validationSummaryVisibleRef.current || !editedSinceReviewRef.current) {
      return;
    }

    clearValidationSummary();
  }, [clearValidationSummary]);

  const handleApplicationCompleted = useCallback(() => {
    clearApplicationDraft(draftKey);
    setShowConfirmDialog(false);
    setIsApplicationSubmitted(true);
    onSuccess?.();
  }, [draftKey, onSuccess]);

  const {
    submit: submitApplication,
    isPending: isApplicationPending,
    isConfirming,
  } = useApplyJob({ onCompleted: handleApplicationCompleted });

  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      writeApplicationDraft(draftKey, values);

      if (validationSummaryVisibleRef.current && name && type === 'change') {
        editedSinceReviewRef.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, [draftKey, form]);

  const handleFormSubmit = useCallback(
    (data: Record<string, unknown>) => {
      clearValidationSummary();
      writeApplicationDraft(draftKey, data);

      if (!isConnected) {
        return;
      }

      if (stakeAmount === null) {
        return;
      }

      setPendingFormData(data);
      setShowConfirmDialog(true);
    },
    [clearValidationSummary, draftKey, isConnected, stakeAmount],
  );

  const handleConfirmSubmit = useCallback(() => {
    if (!isConnected || !address || !pendingFormData || stakeAmount === null) {
      return;
    }

    const { answerBuckets, resumeUpload, fileUploads, candidateIdentityInputs, candidateProfileInput, fieldValues } =
      extractApplicationSubmission(applyForm, pendingFormData);

    submitApplication({
      address,
      jobData,
      stakeAmount,
      formId: applyForm.form.id,
      answerBuckets,
      fieldValues,
      resumeUpload,
      fileUploads,
      candidateIdentityInputs,
      candidateProfileInput,
      aiCriteriaEvaluation: aiCriteriaEvaluation.finalization,
    });
  }, [
    isConnected,
    address,
    pendingFormData,
    stakeAmount,
    applyForm,
    jobData,
    submitApplication,
    aiCriteriaEvaluation.finalization,
  ]);

  useEffect(() => {
    if (validationIssues.length > 0) {
      validationSummaryRef.current?.focus({ preventScroll: true });
      validationSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [validationIssues]);

  const isSubmitting = form.formState.isSubmitting || isApplicationPending;
  const stakeLoading = isConnected && stakeAmount === null && stakeQuery.isFetching;
  const isPrimaryPending = isSubmitting || stakeLoading;
  const primaryDisabled = isPrimaryPending || isConfirming || stakeAmount === null;
  const primaryLabel = primaryLabelFor(isConfirming);
  const primaryPendingLabel = primaryPendingLabelFor(stakeLoading);

  if (isApplicationSubmitted) {
    return <ApplicationSuccess jobTitle={jobTitle} company={company} />;
  }

  return (
    <>
      <Form {...form}>
        <form
          ref={applicationFormRef}
          onSubmit={form.handleSubmit(handleFormSubmit, handleFormInvalid)}
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

          <Button type="submit" className="w-full" size="lg" disabled={primaryDisabled}>
            {isPrimaryPending && <Spinner data-icon="inline-start" />}
            {isPrimaryPending ? primaryPendingLabel : primaryLabel}
          </Button>

          {isConfirming && !showConfirmDialog && <ActionConfirmationNotice />}
        </form>
      </Form>

      <ApplicationPrivacyNotice
        policy={policy}
        showResumeProcessing={aiCriteriaEvaluation.showResumeProcessing}
        showCriteriaEvaluation={aiCriteriaEvaluation.showCriteriaEvaluation}
        criteriaEvaluationOptOut={aiCriteriaEvaluationOptOut}
        onCriteriaEvaluationOptOutChange={setAiCriteriaEvaluationOptOut}
      />

      {stakeAmount !== null && (
        <ConfirmDialog
          open={isConnected && showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={handleConfirmSubmit}
          jobTitle={jobTitle}
          company={company}
          stakeAmount={stakeAmount}
          responseDeadlineDays={responseDeadlineDays}
          isSubmitting={isSubmitting}
          isConfirming={isConfirming}
        />
      )}
    </>
  );
}

export function ApplicationForm(props: ApplicationFormProps) {
  const { isSignedIn, isSessionLoading, user } = useSession();
  const returnTo = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  });

  if (isSessionLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner aria-label="Loading application form" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <EmptyState
        icon={SignInIcon}
        title="Sign in to apply"
        description="Sign in before entering your application details."
        className="min-h-80"
      >
        <Button asChild className="mt-6">
          <Link to="/login" search={{ returnTo }}>
            Sign in
          </Link>
        </Button>
      </EmptyState>
    );
  }

  return <AuthenticatedApplicationForm {...props} accountId={user.id} />;
}
