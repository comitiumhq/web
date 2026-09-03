import { z } from 'zod';
import { isDefined } from '../guards';

export const currencyAnswerSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3).toUpperCase(),
});

export type CurrencyAnswer = z.infer<typeof currencyAnswerSchema>;

export interface CurrencyAnswerDraft {
  amount?: number;
  currency: string;
}

const currencyAnswerDraftSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
});

export const scoreAnswerSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export type ScoreAnswer = z.infer<typeof scoreAnswerSchema>;

export type ScoreAnswerDraft = Partial<ScoreAnswer>;

const scoreAnswerDraftSchema = z.object({
  score: z.number().optional(),
  comment: z.string().optional(),
});

export function normalizeCurrencyAnswer(value: unknown, defaultCurrency: string): CurrencyAnswerDraft {
  const answer = currencyAnswerDraftSchema.safeParse(value);

  if (!answer.success) {
    return { currency: defaultCurrency };
  }

  return {
    amount: answer.data.amount,
    currency: answer.data.currency ?? defaultCurrency,
  };
}

export function normalizeScoreAnswer(value: unknown): ScoreAnswerDraft {
  const answer = scoreAnswerDraftSchema.safeParse(value);

  return answer.success ? answer.data : {};
}

export function isEmptyCurrencyAnswer(value: unknown): boolean {
  const answer = currencyAnswerDraftSchema.safeParse(value);

  return !answer.success || !isDefined(answer.data.amount);
}

export function isEmptyScoreAnswer(value: unknown): boolean {
  const answer = normalizeScoreAnswer(value);

  if (isDefined(answer.score)) {
    return false;
  }

  return !answer.comment?.trim();
}
