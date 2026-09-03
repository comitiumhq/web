import { z } from 'zod';

import type { NestedForm } from './form-definitions';

import { readNonEmptyText } from './text-value';

export const APPLICATION_REQUIRED_FIELDS = [
  {
    key: 'first_name',
    questionType: 'short_answer',
    prompt: 'First name',
    description: null,
    config: { candidateProfileField: 'first_name' },
  },
  {
    key: 'last_name',
    questionType: 'short_answer',
    prompt: 'Last name',
    description: null,
    config: { candidateProfileField: 'last_name' },
  },
  {
    key: 'email',
    questionType: 'email',
    prompt: 'Email',
    description: null,
    config: null,
  },
] as const;

type CandidateProfileField = 'first_name' | 'last_name';

type ApplicationRequiredQuestion = Pick<NestedForm['sections'][number]['questions'][number], 'questionType' | 'config'>;

function matchesApplicationRequiredField(
  question: ApplicationRequiredQuestion,
  definition: (typeof APPLICATION_REQUIRED_FIELDS)[number],
): boolean {
  if (definition.key === 'email') {
    return question.questionType === definition.questionType;
  }

  return question.config?.candidateProfileField === definition.key;
}

export function orderApplicationRequiredQuestionsFirst<Question extends ApplicationRequiredQuestion>(
  questions: readonly Question[],
): Question[] {
  const remainingQuestions = [...questions];
  const requiredQuestions: Question[] = [];

  for (const definition of APPLICATION_REQUIRED_FIELDS) {
    const questionIndex = remainingQuestions.findIndex((question) =>
      matchesApplicationRequiredField(question, definition),
    );

    if (questionIndex === -1) {
      return [...questions];
    }

    const [question] = remainingQuestions.splice(questionIndex, 1);
    requiredQuestions.push(question);
  }

  return [...requiredQuestions, ...remainingQuestions];
}

export const candidateProfileInputValueSchema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
  })
  .strict();

export type CandidateProfileInputValue = z.infer<typeof candidateProfileInputValueSchema>;

function readApplicationProfileField(
  form: Pick<NestedForm, 'sections'> | null,
  values: Record<string, unknown> | null,
  field: CandidateProfileField,
): string | null {
  if (!form || !values) {
    return null;
  }

  const question = form.sections
    .flatMap((section) => section.questions)
    .find((candidate) => candidate.config?.candidateProfileField === field);

  return question ? readNonEmptyText(values[question.id]) : null;
}

export function extractCandidateProfileInput(
  form: Pick<NestedForm, 'sections'>,
  values: Record<string, unknown>,
): CandidateProfileInputValue {
  const firstName = readApplicationProfileField(form, values, 'first_name');
  const lastName = readApplicationProfileField(form, values, 'last_name');

  if (!firstName || !lastName) {
    throw new Error('The required candidate name is missing.');
  }

  return { firstName, lastName };
}
