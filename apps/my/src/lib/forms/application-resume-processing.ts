export function resolveAiCriteriaEvaluationChoice(hasResumeUpload: boolean, policyEnabled: boolean, optOut: boolean) {
  return {
    showResumeProcessing: hasResumeUpload,
    showCriteriaEvaluation: hasResumeUpload && policyEnabled,
    finalization: {
      policyEnabled,
      optOut: hasResumeUpload && policyEnabled && optOut,
    },
  };
}
