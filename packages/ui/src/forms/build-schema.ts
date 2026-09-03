import { httpsUrlSchema } from '@comitium/schemas/common';
import {
  currencyAnswerSchema,
  isEmptyCurrencyAnswer,
  isEmptyScoreAnswer,
  scoreAnswerSchema,
} from '@comitium/schemas/forms/answer-values';
import type { RenderableForm, RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import { isDefined } from '@comitium/schemas/guards';
import { DATE_YYYY_MM_DD_REGEX, PHONE_NUMBER_REGEX } from '@comitium/schemas/patterns';
import { z } from 'zod';

type FormValues = Record<string, unknown>;

type FormShape = RenderableForm;

const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

const VALIDATION_MESSAGE = {
  amount: 'Enter an amount',
  date: 'Select a date',
  email: 'Enter a valid email address',
  file: 'Upload a file',
  location: 'Select a location',
  number: 'Enter a number',
  option: 'Select an option',
  options: 'Select at least one option',
  rating: 'Select a rating',
  resume: 'Upload your resume or CV',
  url: 'Enter a valid URL',
  yesNo: 'Choose Yes or No',
} as const;

function withRequirement(base: z.ZodTypeAny, isRequired: boolean): z.ZodTypeAny {
  if (isRequired) {
    return base;
  }

  return base.optional().nullable();
}

function optionalText(base: z.ZodTypeAny): z.ZodTypeAny {
  return z.preprocess((value) => (value === '' || !isDefined(value) ? undefined : value), base.optional());
}

function requiredTextMessage(prompt: string): string {
  return prompt.trim().endsWith('?') ? 'Answer this question' : `${prompt} is required`;
}

function fileSchema(question: RenderableFormQuestion): z.ZodTypeAny {
  const config = question.config ?? null;
  const maxSize = config?.maxFileSizeBytes ?? null;
  const requiredMessage = question.questionType === 'resume' ? VALIDATION_MESSAGE.resume : VALIDATION_MESSAGE.file;

  let schema: z.ZodType<File> = z.instanceof(File, { message: requiredMessage });

  if (maxSize) {
    schema = schema.refine((f: File) => f.size <= maxSize, {
      message: `File exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    });
  }

  return withRequirement(schema, question.isRequired);
}

function ratingSchema(min: number, max: number, isRequired: boolean): z.ZodTypeAny {
  return withRequirement(z.number({ error: VALIDATION_MESSAGE.rating }).int().min(min).max(max), isRequired);
}

function validatedObject<T>(schema: z.ZodType<T>, message: string): z.ZodType<T> {
  return z
    .unknown()
    .refine((value) => schema.safeParse(value).success, message)
    .transform((value) => schema.parse(value));
}

function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, '').length;
}

function phoneSchema(question: RenderableFormQuestion, isRequired: boolean): z.ZodTypeAny {
  const base = z
    .string({ error: `${question.prompt} is required` })
    .trim()
    .min(1, `${question.prompt} is required`)
    .max(32, 'Phone number is too long')
    .regex(PHONE_NUMBER_REGEX, 'Enter a valid phone number')
    .refine((value) => {
      const digitCount = phoneDigitCount(value);

      return digitCount >= PHONE_MIN_DIGITS && digitCount <= PHONE_MAX_DIGITS;
    }, 'Enter a valid phone number');

  return isRequired ? base : optionalText(base);
}

function buildQuestionSchema(question: RenderableFormQuestion): z.ZodTypeAny {
  const required = question.isRequired;

  switch (question.questionType) {
    case 'short_answer':
    case 'long_unformatted':
    case 'long_formattable': {
      const requiredMessage = requiredTextMessage(question.prompt);
      const base = z.string({ error: requiredMessage }).trim().min(1, requiredMessage);

      return required ? base : optionalText(z.string().trim());
    }

    case 'phone':
      return phoneSchema(question, required);

    case 'candidate_location':
    case 'location': {
      const location = z.object({
        city: z.string().trim().min(1),
        region: z.string().trim().min(1).optional(),
        country: z.string().trim().length(2),
      });
      const base = z.unknown().refine((value) => location.safeParse(value).success, VALIDATION_MESSAGE.location);

      return required ? base : base.optional().nullable();
    }

    case 'email': {
      const base = z.string({ error: VALIDATION_MESSAGE.email }).trim().pipe(z.email(VALIDATION_MESSAGE.email));

      return required ? base : optionalText(base);
    }

    case 'url': {
      const base = z.string({ error: VALIDATION_MESSAGE.url }).trim().pipe(httpsUrlSchema);

      return required ? base : optionalText(base);
    }

    case 'number': {
      const base = z.number({ error: VALIDATION_MESSAGE.number }).min(0, 'Must be 0 or greater');

      return required ? base : base.optional().nullable();
    }

    case 'currency': {
      const base = validatedObject(currencyAnswerSchema, VALIDATION_MESSAGE.amount);

      return required
        ? base
        : z.preprocess((value) => (isEmptyCurrencyAnswer(value) ? undefined : value), base.optional());
    }

    case 'date': {
      const base = z.string({ error: VALIDATION_MESSAGE.date }).regex(DATE_YYYY_MM_DD_REGEX, VALIDATION_MESSAGE.date);

      return required ? base : optionalText(base);
    }

    case 'yes_no': {
      const base = z.boolean({ error: VALIDATION_MESSAGE.yesNo });

      return required ? base : base.optional().nullable();
    }

    case 'multiple_choice': {
      const values = question.selectableValues?.map((v) => v.value) ?? [];

      if (values.length === 0) {
        const base = z.string({ error: VALIDATION_MESSAGE.option }).min(1, VALIDATION_MESSAGE.option);

        return required ? base : optionalText(base);
      }

      const base = z.enum(values as [string, ...string[]], { error: VALIDATION_MESSAGE.option });

      return required ? base : optionalText(base);
    }

    case 'checkboxes': {
      const values = question.selectableValues?.map((v) => v.value) ?? [];

      if (values.length === 0) {
        return required
          ? z.array(z.string(), { error: VALIDATION_MESSAGE.options }).min(1, VALIDATION_MESSAGE.options)
          : z.array(z.string()).optional();
      }

      const base = z.array(z.enum(values as [string, ...string[]], { error: VALIDATION_MESSAGE.options }), {
        error: VALIDATION_MESSAGE.options,
      });

      return required ? base.min(1, VALIDATION_MESSAGE.options) : base.optional();
    }

    case 'score': {
      const base = validatedObject(scoreAnswerSchema, VALIDATION_MESSAGE.rating);

      return required
        ? base
        : z.preprocess((value) => (isEmptyScoreAnswer(value) ? undefined : value), base.optional());
    }

    case 'linear_rating':
      return ratingSchema(1, 10, required);

    case 'nps_rating':
      return ratingSchema(0, 10, required);

    case 'resume':
    case 'file':
      return fileSchema(question);

    case 'employee': {
      const base = z.guid(VALIDATION_MESSAGE.option);

      return required ? base : optionalText(base);
    }

    default:
      return z.unknown();
  }
}

export function buildFormSchema(form: FormShape): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const section of form.sections) {
    for (const question of section.questions) {
      shape[question.id] = buildQuestionSchema(question);
    }
  }

  return z.object(shape);
}

export function buildDefaultValues(form: FormShape): FormValues {
  const defaults: FormValues = {};

  for (const section of form.sections) {
    for (const q of section.questions) {
      defaults[q.id] = defaultValueFor(q);
    }
  }

  return defaults;
}

function defaultValueFor(q: RenderableFormQuestion): unknown {
  switch (q.questionType) {
    case 'checkboxes':
      return [];

    case 'yes_no':
    case 'number':
    case 'score':
    case 'linear_rating':
    case 'nps_rating':
      return undefined;

    case 'currency':
      return { amount: undefined, currency: 'USD' };

    case 'resume':
    case 'file':
    case 'candidate_location':
    case 'location':
      return undefined;

    default:
      return '';
  }
}
