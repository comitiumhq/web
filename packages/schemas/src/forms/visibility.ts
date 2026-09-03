const ANSWER_VISIBILITIES = ['standard', 'private'] as const;

export type AnswerVisibility = (typeof ANSWER_VISIBILITIES)[number];

export function questionVisibility(isPrivate: boolean): AnswerVisibility {
  return isPrivate ? 'private' : 'standard';
}

export interface AnswerBucketInput {
  visibility: AnswerVisibility;
  answers: Record<string, unknown>;
}

export function splitAnswersByVisibility(
  sections: { questions: { id: string; isPrivate: boolean }[] }[],
  values: Record<string, unknown>,
): AnswerBucketInput[] {
  const byVisibility = new Map<AnswerVisibility, Record<string, unknown>>([['standard', {}]]);

  for (const section of sections) {
    for (const q of section.questions) {
      const visibility = questionVisibility(q.isPrivate);
      const bucket = byVisibility.get(visibility) ?? {};
      bucket[q.id] = values[q.id] ?? null;
      byVisibility.set(visibility, bucket);
    }
  }

  return [...byVisibility.entries()].map(([visibility, answers]) => ({ visibility, answers }));
}
