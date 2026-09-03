import {
  type CandidateProfileInputValue,
  extractCandidateProfileInput,
} from '@comitium/schemas/forms/application-required-fields';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import type { FormSubmissionFieldValue } from '@comitium/schemas/forms/form-submission';
import { extractSubmissionFieldValues } from '@comitium/schemas/forms/submission-field-values';
import { type AnswerVisibility, questionVisibility } from '@comitium/schemas/forms/visibility';
import { generateDatabaseId } from '@/lib/utils/database-id';
import { type CandidateIdentityInputValue, extractCandidateIdentityInputs } from './candidate-identity-inputs';

interface ApplicationSubmission {
  answerBuckets: { visibility: AnswerVisibility; questionIds: string[]; answers: Record<string, unknown> }[];
  resumeUpload: { fileId: string; questionId: string; file: File } | null;
  fileUploads: { fileId: string; questionId: string; visibility: AnswerVisibility; file: File }[];
  candidateIdentityInputs: CandidateIdentityInputValue[];
  candidateProfileInput: CandidateProfileInputValue;
  fieldValues: FormSubmissionFieldValue[];
}

export function resolveAiCriteriaEvaluationChoice(form: NestedForm, policyEnabled: boolean, optOut: boolean) {
  const hasResumeQuestion = form.sections.some((section) =>
    section.questions.some((question) => question.questionType === 'resume'),
  );

  return {
    showResumeProcessing: hasResumeQuestion,
    showCriteriaEvaluation: hasResumeQuestion && policyEnabled,
    finalization: {
      policyEnabled,
      optOut: hasResumeQuestion && policyEnabled && optOut,
    },
  };
}

export function extractApplicationSubmission(form: NestedForm, values: Record<string, unknown>): ApplicationSubmission {
  const answersByVisibility = new Map<AnswerVisibility, Record<string, unknown>>([['standard', {}]]);
  let resumeUpload: ApplicationSubmission['resumeUpload'] = null;
  const fileUploads: ApplicationSubmission['fileUploads'] = [];
  const { inputs: candidateIdentityInputs, questionIds: identityQuestionIds } = extractCandidateIdentityInputs(
    form,
    values,
  );
  const candidateProfileInput = extractCandidateProfileInput(form, values);
  const fieldValues = extractSubmissionFieldValues(form, values);

  const putAnswer = (visibility: AnswerVisibility, questionId: string, value: unknown) => {
    const bucket = answersByVisibility.get(visibility) ?? {};
    bucket[questionId] = value;
    answersByVisibility.set(visibility, bucket);
  };

  for (const section of form.sections) {
    for (const question of section.questions) {
      const value = values[question.id];
      const visibility = questionVisibility(question.isPrivate);

      if (identityQuestionIds.has(question.id)) {
        continue;
      }

      if (question.questionType === 'resume' && value instanceof File) {
        resumeUpload = { fileId: generateDatabaseId(), questionId: question.id, file: value };
        putAnswer(visibility, question.id, {
          kind: 'resume',
          filename: value.name,
          size: value.size,
          mimeType: value.type,
        });
        continue;
      }

      if (question.questionType === 'file' && value instanceof File) {
        fileUploads.push({ fileId: generateDatabaseId(), questionId: question.id, visibility, file: value });
        continue;
      }

      putAnswer(visibility, question.id, value ?? null);
    }
  }

  const answerBuckets = [...answersByVisibility.entries()]
    .map(([visibility, answers]) => ({ visibility, questionIds: Object.keys(answers), answers }))
    .filter((bucket) => bucket.questionIds.length > 0);

  return {
    answerBuckets,
    resumeUpload,
    fileUploads,
    candidateIdentityInputs,
    candidateProfileInput,
    fieldValues,
  };
}
