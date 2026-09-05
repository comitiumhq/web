import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import { resolveAiCriteriaEvaluationChoice } from '@/lib/forms/application-resume-processing';

interface ApplicationResumeProcessingParams {
  applyForm: NestedForm;
  control: Control<Record<string, unknown>>;
  policyEnabled: boolean;
  postingId: string;
}

export function useApplicationResumeProcessing({
  applyForm,
  control,
  policyEnabled,
  postingId,
}: ApplicationResumeProcessingParams) {
  const [criteriaEvaluationOptOut, setCriteriaEvaluationOptOut] = useState(false);
  const resumeQuestionIds = useMemo(
    () =>
      applyForm.sections.flatMap((section) =>
        section.questions.filter((question) => question.questionType === 'resume').map((question) => question.id),
      ),
    [applyForm.sections],
  );
  const resumeValues = useWatch({ control, name: resumeQuestionIds });
  const hasResumeUpload = resumeValues.some((value) => value instanceof File);
  const choice = resolveAiCriteriaEvaluationChoice(hasResumeUpload, policyEnabled, criteriaEvaluationOptOut);

  useEffect(() => {
    setCriteriaEvaluationOptOut(false);
  }, [choice.showCriteriaEvaluation, postingId]);

  const resolveFinalization = useCallback(
    (hasResumeUpload: boolean) =>
      resolveAiCriteriaEvaluationChoice(hasResumeUpload, policyEnabled, criteriaEvaluationOptOut).finalization,
    [criteriaEvaluationOptOut, policyEnabled],
  );

  return {
    privacyNoticeProps: {
      showResumeProcessing: choice.showResumeProcessing,
      showCriteriaEvaluation: choice.showCriteriaEvaluation,
      criteriaEvaluationOptOut,
      onCriteriaEvaluationOptOutChange: setCriteriaEvaluationOptOut,
    },
    resolveFinalization,
  };
}
