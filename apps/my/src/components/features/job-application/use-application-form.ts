import type { CareerJob } from '@comitium/jobs/schemas';
import { orderApplicationRequiredQuestionsFirst } from '@comitium/schemas/forms/application-required-fields';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { buildDefaultValues, buildFormSchema } from '@/components/features/form-runtime';
import { extractApplicationSubmission } from '@/lib/forms/application-submission';
import {
  clearApplicationDraft,
  createApplicationDraftKey,
  readApplicationDraft,
  writeApplicationDraft,
} from './application-draft-cache';
import { useApplicationResumeProcessing } from './use-application-resume-processing';

interface ApplicationValidationIssue {
  questionId: string;
  label: string;
  message: string;
}

interface UseApplicationFormParams {
  accountId: string;
  applyForm: NestedForm;
  postingId: string;
  policy: CareerJob['recruitingPrivacy'];
  onSuccess?: () => void;
}

export function useApplicationForm({ accountId, applyForm, postingId, policy, onSuccess }: UseApplicationFormParams) {
  const [isApplicationSubmitted, setIsApplicationSubmitted] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ApplicationValidationIssue[]>([]);
  const applicationFormRef = useRef<HTMLFormElement>(null);
  const validationSummaryRef = useRef<HTMLDivElement>(null);
  const validationSummaryVisibleRef = useRef(false);
  const editedSinceReviewRef = useRef(false);

  const schema = useMemo(() => buildFormSchema(applyForm), [applyForm]);

  const draftKey = useMemo(
    () => createApplicationDraftKey(accountId, postingId, applyForm.form.id),
    [accountId, postingId, applyForm.form.id],
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

  const { privacyNoticeProps, resolveFinalization } = useApplicationResumeProcessing({
    applyForm,
    control: form.control,
    policyEnabled: policy.aiCriteriaEvaluation.enabled,
    postingId,
  });

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
    setIsApplicationSubmitted(true);
    onSuccess?.();
  }, [draftKey, onSuccess]);

  const prepareSubmission = useCallback(
    (data: Record<string, unknown>) => {
      clearValidationSummary();
      writeApplicationDraft(draftKey, data);

      const submission = extractApplicationSubmission(applyForm, data);

      return {
        ...submission,
        aiCriteriaEvaluation: resolveFinalization(submission.resumeUpload !== null),
      };
    },
    [applyForm, clearValidationSummary, draftKey, resolveFinalization],
  );

  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      writeApplicationDraft(draftKey, values);

      if (validationSummaryVisibleRef.current && name && type === 'change') {
        editedSinceReviewRef.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, [draftKey, form]);

  useEffect(() => {
    if (validationIssues.length === 0) {
      return;
    }

    validationSummaryRef.current?.focus({ preventScroll: true });
    validationSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [validationIssues]);

  return {
    applicationFormRef,
    clearValidationSummary,
    form,
    handleApplicationCompleted,
    handleFormBlur,
    handleFormInvalid,
    handleValidationIssueClick,
    isApplicationSubmitted,
    prepareSubmission,
    privacyNoticeProps,
    validationIssues,
    validationSummaryRef,
  };
}

export type ApplicationFormController = ReturnType<typeof useApplicationForm>;
