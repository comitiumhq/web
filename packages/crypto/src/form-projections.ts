import { z } from 'zod';

import type { ProjectionSnapshot } from './candidate-projections';
import type { CategoricalFormFieldKind } from './form-field-search-hash';
import { connectorValueSchemas, currencyAnswerSchema, scoreAnswerSchema } from './form-values';
import { isString } from './runtime-guards';
import type { FormSubmissionFieldProjection } from './schemas/search';

type SubmissionForm = Pick<ProjectionSnapshot, 'sections'>;
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

export type SubmissionFieldProjectionSource =
  | FieldProjectionSource<'boolean', boolean>
  | FieldProjectionSource<'option', string>
  | FieldProjectionSource<'number', string>
  | FieldProjectionSource<'timestamp', string>;

interface FieldProjectionSource<Kind extends string, Value> {
  questionId: string;
  reusableFieldId: string;
  ordinal: number;
  kind: Kind;
  value: Value;
}

export async function projectSubmissionFieldValues(
  form: SubmissionForm,
  answers: Record<string, unknown>,
  hashValue: (fieldId: string, kind: CategoricalFormFieldKind, value: boolean | string) => Promise<string>,
): Promise<FormSubmissionFieldProjection[]> {
  return Promise.all(
    extractSubmissionFieldProjectionSources(form, answers).map(async (source) => {
      const identity = {
        questionId: source.questionId,
        reusableFieldId: source.reusableFieldId,
        ordinal: source.ordinal,
      };

      switch (source.kind) {
        case 'boolean':
        case 'option':
          return {
            ...identity,
            kind: 'digest' as const,
            value: await hashValue(source.reusableFieldId, source.kind, source.value),
          };

        case 'number':
        case 'timestamp':
          return { ...identity, kind: source.kind, value: source.value };
      }
    }),
  );
}

export function extractSubmissionFieldProjectionSources(
  form: SubmissionForm,
  answers: Record<string, unknown>,
): SubmissionFieldProjectionSource[] {
  const fieldValues: SubmissionFieldProjectionSource[] = [];

  for (const question of form.sections.flatMap((section) => section.questions)) {
    const reusableField = question.reusableField;
    const answer = answers[question.id];

    if (!reusableField || isEmptyFormAnswer(answer)) {
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

export function isEmptyFormAnswer(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

export function projectConnectorAnswer(
  answer: unknown,
  sourceType: string,
  targetType: string,
  mapping: Record<string, string> | null,
  fallback: string | null,
): unknown | null {
  if (answer === null || answer === undefined || answer === '') {
    return null;
  }

  const mapped = (value: string) => mapping?.[value] ?? fallback;

  if (sourceType === 'multiple_choice' && targetType === 'checkboxes') {
    const value = isString(answer) ? mapped(answer) : null;

    return value ? [value] : null;
  }

  if (sourceType === 'checkboxes' && targetType === 'multiple_choice') {
    if (!Array.isArray(answer)) {
      return null;
    }

    for (const value of answer) {
      const output = isString(value) ? mapped(value) : null;

      if (output) {
        return output;
      }
    }

    return null;
  }

  if (Array.isArray(answer)) {
    return targetType === 'checkboxes' && answer.every(isString) ? answer : null;
  }

  if (targetType === 'multiple_choice') {
    return isString(answer) ? answer : null;
  }

  const schema = connectorValueSchemas[targetType as keyof typeof connectorValueSchemas];
  const parsed = schema?.safeParse(answer);

  return parsed?.success ? parsed.data : null;
}
