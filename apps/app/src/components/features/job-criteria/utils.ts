import { type EvaluationCriterion, evaluationCriterionSchema } from '@comitium/schemas/jobs';
import { MAX_EVALUATION_CRITERIA } from '@/lib/jobs/evaluation-criteria';

export function prepareCriteriaAutosave(criteria: EvaluationCriterion[]) {
  const normalized = criteria.map((criterion) => ({
    ...criterion,
    title: criterion.title.trim(),
    prompt: criterion.prompt.trim(),
  }));

  const messages: string[] = [];

  if (normalized.length > MAX_EVALUATION_CRITERIA) {
    messages.push(`Use no more than ${MAX_EVALUATION_CRITERIA} evaluation criteria`);
  }

  for (const [index, criterion] of normalized.entries()) {
    const result = evaluationCriterionSchema.safeParse(criterion);

    if (result.success) {
      continue;
    }

    for (const issue of result.error.issues) {
      const field = issue.path[0] === 'prompt' ? 'Evaluation prompt' : 'Title';
      let message = issue.message;

      if (issue.code === 'too_small') {
        message = `${field} is required`;
      } else if (issue.code === 'too_big') {
        message = `${field} must be at most ${issue.maximum} characters`;
      }

      messages.push(`Criterion ${index + 1}: ${message}`);
    }
  }

  return { criteria: normalized.length ? normalized : null, valid: messages.length === 0, messages };
}
