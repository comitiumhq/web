import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import { describe, expect, it } from 'vitest';

import { extractApplicationSubmission, resolveAiCriteriaEvaluationChoice } from '../application-submission';

const EMAIL_ID = '11111111-1111-4111-8111-111111111111';
const FIRST_NAME_ID = '22222222-2222-4222-8222-222222222222';
const LAST_NAME_ID = '77777777-7777-4777-8777-777777777777';
const PRIVATE_ID = '33333333-3333-4333-8333-333333333333';
const SECONDARY_EMAIL_ID = '66666666-6666-4666-8666-666666666666';

const form: NestedForm = {
  form: { id: '44444444-4444-4444-8444-444444444444', formClass: 'application', title: 'Apply' },
  sections: [
    {
      id: '55555555-5555-4555-8555-555555555555',
      position: 0,
      title: 'Application',
      questions: [
        {
          id: SECONDARY_EMAIL_ID,
          position: -1,
          questionType: 'email',
          prompt: 'Secondary email',
          description: null,
          isRequired: false,
          isPrivate: false,
          visibility: 'standard',
          isLocked: false,
          selectableValues: null,
          config: null,
          reusableField: null,
        },
        {
          id: EMAIL_ID,
          position: 0,
          questionType: 'email',
          prompt: 'Email',
          description: null,
          isRequired: true,
          isPrivate: false,
          visibility: 'standard',
          isLocked: true,
          selectableValues: null,
          config: null,
          reusableField: null,
        },
        {
          id: FIRST_NAME_ID,
          position: 1,
          questionType: 'short_answer',
          prompt: 'First name',
          description: null,
          isRequired: true,
          isPrivate: false,
          visibility: 'standard',
          isLocked: true,
          selectableValues: null,
          config: { candidateProfileField: 'first_name' },
          reusableField: null,
        },
        {
          id: LAST_NAME_ID,
          position: 2,
          questionType: 'short_answer',
          prompt: 'Last name',
          description: null,
          isRequired: true,
          isPrivate: false,
          visibility: 'standard',
          isLocked: true,
          selectableValues: null,
          config: { candidateProfileField: 'last_name' },
          reusableField: null,
        },
        {
          id: PRIVATE_ID,
          position: 3,
          questionType: 'short_answer',
          prompt: 'Internal',
          description: null,
          isRequired: false,
          isPrivate: true,
          visibility: 'private',
          selectableValues: null,
          config: null,
          reusableField: null,
        },
      ],
    },
  ],
};

const formWithResume: NestedForm = {
  ...form,
  sections: form.sections.map((section) => ({
    ...section,
    questions: [
      ...section.questions,
      {
        ...section.questions[0],
        id: '88888888-8888-4888-8888-888888888888',
        position: section.questions.length,
        questionType: 'resume',
        prompt: 'Resume',
      },
    ],
  })),
};

describe('application submission contract', () => {
  it('keeps names in standard answers and reserves processor identity access for email', () => {
    const submission = extractApplicationSubmission(form, {
      [EMAIL_ID]: 'applicant@example.com',
      [SECONDARY_EMAIL_ID]: 'secondary@example.com',
      [FIRST_NAME_ID]: 'Ada',
      [LAST_NAME_ID]: 'Lovelace',
      [PRIVATE_ID]: 'Private answer',
    });

    expect(submission.candidateIdentityInputs).toEqual([
      { questionId: SECONDARY_EMAIL_ID, value: 'secondary@example.com', processorAccess: false },
      { questionId: EMAIL_ID, value: 'applicant@example.com', processorAccess: true },
    ]);
    expect(submission.candidateProfileInput).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(submission.answerBuckets).toEqual([
      {
        visibility: 'standard',
        questionIds: [FIRST_NAME_ID, LAST_NAME_ID],
        answers: { [FIRST_NAME_ID]: 'Ada', [LAST_NAME_ID]: 'Lovelace' },
      },
      { visibility: 'private', questionIds: [PRIVATE_ID], answers: { [PRIVATE_ID]: 'Private answer' } },
    ]);
    expect(submission.fieldValues).toEqual([]);
  });

  it.each([
    [
      form,
      true,
      true,
      {
        showResumeProcessing: false,
        showCriteriaEvaluation: false,
        finalization: { policyEnabled: true, optOut: false },
      },
    ],
    [
      formWithResume,
      false,
      true,
      {
        showResumeProcessing: true,
        showCriteriaEvaluation: false,
        finalization: { policyEnabled: false, optOut: false },
      },
    ],
    [
      formWithResume,
      true,
      false,
      {
        showResumeProcessing: true,
        showCriteriaEvaluation: true,
        finalization: { policyEnabled: true, optOut: false },
      },
    ],
    [
      formWithResume,
      true,
      true,
      {
        showResumeProcessing: true,
        showCriteriaEvaluation: true,
        finalization: { policyEnabled: true, optOut: true },
      },
    ],
  ] as const)('resolves AI criteria evaluation choice', (applicationForm, policyEnabled, optOut, expected) => {
    expect(resolveAiCriteriaEvaluationChoice(applicationForm, policyEnabled, optOut)).toEqual(expected);
  });
});
