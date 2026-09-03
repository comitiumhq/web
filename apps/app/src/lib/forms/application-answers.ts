export type CandidateIdentityAnswers = Record<string, unknown>;

export function mergeApplicationAnswers(
  answers: Record<string, unknown> | null,
  identityAnswers?: CandidateIdentityAnswers,
): Record<string, unknown> | null {
  if (!identityAnswers || Object.keys(identityAnswers).length === 0) {
    return answers;
  }

  return { ...answers, ...identityAnswers };
}
