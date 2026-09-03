import { z } from 'zod';
import { isDefined } from '../guards';
import { currencyAnswerSchema, scoreAnswerSchema } from './answer-values';

import type { FormDefinitionSnapshot, FormSubmissionFieldValue } from './form-submission';

type SubmissionForm = Pick<FormDefinitionSnapshot, 'sections'>;
type SubmissionQuestion = SubmissionForm['sections'][number]['questions'][number];

const booleanAnswerSchema = z.boolean();
const optionAnswersSchema = z.union([z.string().transform((value) => [value]), z.array(z.string())]);
const numberAnswerSchema = z.number();
const scoreNumericAnswerSchema = scoreAnswerSchema.transform((value) => value.score);
const currencyNumericAnswerSchema = currencyAnswerSchema.transform((value) => value.amount);
const dateAnswerSchema = z.iso.date().transform((value) => `${value}T00:00:00.000Z`);

const canonicalDecimalFormatter = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 21,
  useGrouping: false,
});

export function extractSubmissionFieldValues(
  form: SubmissionForm,
  answers: Record<string, unknown>,
): FormSubmissionFieldValue[] {
  const fieldValues: FormSubmissionFieldValue[] = [];

  for (const question of form.sections.flatMap((section) => section.questions)) {
    const reusableField = question.reusableField;
    const answer = answers[question.id];

    if (!reusableField || isEmptyAnswer(answer)) {
      continue;
    }

    const fieldValueIdentity = { questionId: question.id, reusableFieldId: reusableField.fieldId };

    switch (reusableField.valueKind) {
      case 'boolean': {
        const value = parseAnswer(booleanAnswerSchema, question, answer);
        fieldValues.push({ ...fieldValueIdentity, ordinal: 0, kind: 'boolean', value });
        break;
      }

      case 'option': {
        const values = parseAnswer(optionAnswersSchema, question, answer);

        for (const [ordinal, value] of values.entries()) {
          fieldValues.push({ ...fieldValueIdentity, ordinal, kind: 'option', value });
        }

        break;
      }

      case 'number': {
        const value = parseNumericAnswer(question, answer);
        fieldValues.push({
          ...fieldValueIdentity,
          ordinal: 0,
          kind: 'number',
          value: canonicalDecimalFormatter.format(value),
        });
        break;
      }

      case 'timestamp': {
        const value = parseAnswer(dateAnswerSchema, question, answer);
        fieldValues.push({ ...fieldValueIdentity, ordinal: 0, kind: 'timestamp', value });
        break;
      }

      default:
        throw new Error(`Unsupported reusable field value kind: ${reusableField.valueKind satisfies never}`);
    }
  }

  return fieldValues;
}

function parseNumericAnswer(question: SubmissionQuestion, answer: unknown): number {
  const optionValueMap = question.reusableField?.optionValueMap;

  if (!optionValueMap) {
    if (question.questionType === 'score') {
      return parseAnswer(scoreNumericAnswerSchema, question, answer);
    }

    if (question.questionType === 'currency') {
      return parseAnswer(currencyNumericAnswerSchema, question, answer);
    }

    return parseAnswer(numberAnswerSchema, question, answer);
  }

  const option = parseAnswer(z.string(), question, answer);
  return parseAnswer(numberAnswerSchema, question, optionValueMap[option]);
}

function parseAnswer<T>(schema: z.ZodType<T>, question: SubmissionQuestion, answer: unknown): T {
  const result = schema.safeParse(answer);

  if (!result.success) {
    throw new Error(`Invalid value for "${question.prompt}"`);
  }

  return result.data;
}

function isEmptyAnswer(value: unknown): boolean {
  return !isDefined(value) || value === '' || (Array.isArray(value) && value.length === 0);
}
