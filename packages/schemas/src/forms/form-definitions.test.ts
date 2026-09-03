import { describe, expect, it } from 'vitest';

import { applicationFormOptionsResponseSchema } from './form-definitions';

const UUIDS = {
  form: '019fc2a0-ae8e-7c93-a204-b26968585a6b',
  section: '019fc2a0-b5d8-77d4-bf33-176269a49e6d',
  question: '019fc2a0-b844-7797-a22e-595e2a410c64',
};

function response() {
  return {
    data: [
      {
        id: UUIDS.form,
        title: 'Application form',
        isDefaultForm: true,
        sections: [
          {
            id: UUIDS.section,
            position: 0,
            title: 'Profile',
            questions: [
              {
                id: UUIDS.question,
                position: 0,
                questionType: 'short_answer',
                prompt: 'First name',
                description: null,
                isRequired: true,
                selectableValues: null,
                config: { candidateProfileField: 'first_name' },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('applicationFormOptionsResponseSchema', () => {
  it('accepts the restricted picker projection', () => {
    expect(applicationFormOptionsResponseSchema.parse(response())).toEqual(response());
  });

  it('rejects admin-only question metadata', () => {
    const value = response();

    expect(
      applicationFormOptionsResponseSchema.safeParse({
        ...value,
        data: value.data.map((form) => ({
          ...form,
          sections: form.sections.map((section) => ({
            ...section,
            questions: section.questions.map((question) => ({ ...question, isPrivate: true })),
          })),
        })),
      }).success,
    ).toBe(false);
  });
});
