import { findApplicationEmailQuestion, readApplicationEmail } from '@comitium/schemas/forms/application-email';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import { readNonEmptyText } from '@comitium/schemas/forms/text-value';
import { isDefined } from '@comitium/schemas/guards';

export interface CandidateIdentityInputValue {
  questionId: string;
  value: string;
  processorAccess: boolean;
}

function isIdentityQuestion(questionType: string): boolean {
  return questionType === 'email' || questionType === 'phone';
}

export function extractCandidateIdentityInputs(
  form: NestedForm,
  values: Record<string, unknown>,
): { inputs: CandidateIdentityInputValue[]; questionIds: Set<string> } {
  const questions = form.sections.flatMap((section) => section.questions);
  const identityQuestions = questions.filter((question) => isIdentityQuestion(question.questionType));
  const emailQuestion = findApplicationEmailQuestion(form);
  const email = readApplicationEmail(form, values);

  if (!emailQuestion || !email) {
    throw new Error('The required application email is missing.');
  }

  const inputs = identityQuestions
    .map((question) => {
      const rawValue = question.id === emailQuestion.id ? email : values[question.id];
      const value = readNonEmptyText(rawValue);

      return value
        ? {
            questionId: question.id,
            value,
            processorAccess: question.id === emailQuestion.id,
          }
        : null;
    })
    .filter(isDefined);

  return {
    inputs,
    questionIds: new Set(identityQuestions.map((question) => question.id)),
  };
}
