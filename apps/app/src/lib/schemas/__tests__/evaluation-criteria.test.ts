import { evaluationCriterionSchema } from '@comitium/schemas/jobs';
import { describe, expect, it } from 'vitest';
import {
  MAX_EVALUATION_CRITERIA,
  MAX_EVALUATION_CRITERION_PROMPT_LENGTH,
  MAX_EVALUATION_CRITERION_TITLE_LENGTH,
} from '@/lib/jobs/evaluation-criteria';
import { createJobTemplateBodySchema } from '../job-templates';

function criterion(overrides: { title?: string; prompt?: string } = {}) {
  return {
    id: '277c7ae0-a573-4da7-b88b-f2b914b7ab32',
    title: overrides.title ?? 'React experience',
    prompt: overrides.prompt ?? 'Has built production React applications with TypeScript.',
  };
}

describe('evaluation criteria schemas', () => {
  it('accepts criteria at the shared limits', () => {
    const result = evaluationCriterionSchema.safeParse(
      criterion({
        title: 'T'.repeat(MAX_EVALUATION_CRITERION_TITLE_LENGTH),
        prompt: 'P'.repeat(MAX_EVALUATION_CRITERION_PROMPT_LENGTH),
      }),
    );

    expect(result.success).toBe(true);
  });

  it('rejects prompts above 300 chars', () => {
    const result = evaluationCriterionSchema.safeParse(
      criterion({ prompt: 'P'.repeat(MAX_EVALUATION_CRITERION_PROMPT_LENGTH + 1) }),
    );

    expect(result.success).toBe(false);
  });

  it('rejects titles above 100 chars', () => {
    const result = evaluationCriterionSchema.safeParse(
      criterion({ title: 'T'.repeat(MAX_EVALUATION_CRITERION_TITLE_LENGTH + 1) }),
    );

    expect(result.success).toBe(false);
  });

  it('uses the same criteria limits for job template payloads', () => {
    const result = createJobTemplateBodySchema.safeParse({
      title: 'Template',
      criteria: Array.from({ length: MAX_EVALUATION_CRITERIA + 1 }, () => criterion()),
    });

    expect(result.success).toBe(false);
  });
});
