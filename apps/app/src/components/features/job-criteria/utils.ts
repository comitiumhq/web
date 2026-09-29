import type { EvaluationCriterion } from '@comitium/schemas/jobs';

export function prepareEvaluationCriteria(criteria: EvaluationCriterion[]): EvaluationCriterion[] {
  return criteria.filter((criterion) => criterion.title.trim() && criterion.prompt.trim());
}
