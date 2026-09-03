import type { FormSnapshotQuestion, NestedForm } from './form-definitions';
import { readNonEmptyText } from './text-value';

interface ApplicationResponseEmailInput {
  profileEmail: string | null;
  form: Pick<NestedForm, 'sections'> | null;
  values: Record<string, unknown> | null;
}

function isEmailQuestion(question: FormSnapshotQuestion): boolean {
  return question.questionType === 'email' && question.isLocked === true && question.isRequired;
}

export function findApplicationEmailQuestion(form: Pick<NestedForm, 'sections'>): FormSnapshotQuestion | null {
  for (const section of form.sections) {
    const question = section.questions.find(isEmailQuestion);

    if (question) {
      return question;
    }
  }

  return null;
}

export function readApplicationEmail(
  form: Pick<NestedForm, 'sections'>,
  values: Record<string, unknown>,
): string | null {
  const question = findApplicationEmailQuestion(form);

  if (!question) {
    return null;
  }

  return readNonEmptyText(values[question.id]);
}

export function resolveApplicationResponseEmail({
  profileEmail,
  form,
  values,
}: ApplicationResponseEmailInput): string | null {
  const normalizedProfileEmail = readNonEmptyText(profileEmail);

  if (normalizedProfileEmail) {
    return normalizedProfileEmail;
  }

  if (!form || !values) {
    return null;
  }

  return readApplicationEmail(form, values);
}
