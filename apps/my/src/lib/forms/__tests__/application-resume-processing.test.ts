import { describe, expect, it } from 'vitest';
import { resolveAiCriteriaEvaluationChoice } from '../application-resume-processing';

describe('application resume processing', () => {
  it.each([
    [
      false,
      true,
      true,
      {
        showResumeProcessing: false,
        showCriteriaEvaluation: false,
        finalization: { policyEnabled: true, optOut: false },
      },
    ],
    [
      true,
      false,
      true,
      {
        showResumeProcessing: true,
        showCriteriaEvaluation: false,
        finalization: { policyEnabled: false, optOut: false },
      },
    ],
    [
      true,
      true,
      false,
      {
        showResumeProcessing: true,
        showCriteriaEvaluation: true,
        finalization: { policyEnabled: true, optOut: false },
      },
    ],
    [
      true,
      true,
      true,
      {
        showResumeProcessing: true,
        showCriteriaEvaluation: true,
        finalization: { policyEnabled: true, optOut: true },
      },
    ],
  ] as const)('derives UI and submission choices', (hasResumeUpload, policyEnabled, optOut, expected) => {
    expect(resolveAiCriteriaEvaluationChoice(hasResumeUpload, policyEnabled, optOut)).toEqual(expected);
  });
});
