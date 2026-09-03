import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import { isDefined } from '@comitium/schemas/guards';

const applicationDrafts = new Map<string, Record<string, unknown>>();

export function createApplicationDraftKey(accountId: string, postingId: string, formId: string): string {
  return `comitium:application-draft:${accountId}:${postingId}:${formId}`;
}

export function readApplicationDraft(key: string, form: NestedForm): Record<string, unknown> {
  const draft = applicationDrafts.get(key);

  if (!draft) {
    return {};
  }

  const validQuestionIds = new Set(
    form.sections.flatMap((section) => section.questions.map((question) => question.id)),
  );

  return Object.fromEntries(Object.entries(draft).filter(([questionId]) => validQuestionIds.has(questionId)));
}

export function writeApplicationDraft(key: string, values: Record<string, unknown>): void {
  const definedValues = Object.fromEntries(Object.entries(values).filter(([, value]) => isDefined(value)));

  applicationDrafts.set(key, definedValues);
}

export function clearApplicationDraft(key: string): void {
  applicationDrafts.delete(key);
}
