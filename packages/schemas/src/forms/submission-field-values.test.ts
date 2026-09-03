import { describe, expect, it } from 'vitest';

import type { FormDefinitionSnapshot } from './form-submission';

import { extractSubmissionFieldValues } from './submission-field-values';

const SECTION_ID = '00000000-0000-4000-8000-000000000001';
const BOOLEAN_QUESTION_ID = '00000000-0000-4000-8000-000000000002';
const OPTION_QUESTION_ID = '00000000-0000-4000-8000-000000000003';
const NUMBER_QUESTION_ID = '00000000-0000-4000-8000-000000000004';
const DATE_QUESTION_ID = '00000000-0000-4000-8000-000000000005';
const ONE_OFF_QUESTION_ID = '00000000-0000-4000-8000-000000000006';
const SCORE_QUESTION_ID = '00000000-0000-4000-8000-000000000007';
const DIRECT_NUMBER_QUESTION_ID = '00000000-0000-4000-8000-000000000008';
const CURRENCY_QUESTION_ID = '00000000-0000-4000-8000-000000000009';
const BOOLEAN_FIELD_ID = '00000000-0000-4000-8000-000000000012';
const OPTION_FIELD_ID = '00000000-0000-4000-8000-000000000013';
const NUMBER_FIELD_ID = '00000000-0000-4000-8000-000000000014';
const DATE_FIELD_ID = '00000000-0000-4000-8000-000000000015';
const SCORE_FIELD_ID = '00000000-0000-4000-8000-000000000016';
const DIRECT_NUMBER_FIELD_ID = '00000000-0000-4000-8000-000000000017';
const CURRENCY_FIELD_ID = '00000000-0000-4000-8000-000000000018';

const snapshot: Pick<FormDefinitionSnapshot, 'sections'> = {
  sections: [
    {
      id: SECTION_ID,
      position: 0,
      title: 'Questions',
      questions: [
        question(BOOLEAN_QUESTION_ID, 'yes_no', {
          fieldId: BOOLEAN_FIELD_ID,
          valueKind: 'boolean',
        }),
        question(OPTION_QUESTION_ID, 'checkboxes', {
          fieldId: OPTION_FIELD_ID,
          valueKind: 'option',
        }),
        question(NUMBER_QUESTION_ID, 'multiple_choice', {
          fieldId: NUMBER_FIELD_ID,
          valueKind: 'number',
          optionValueMap: { yes: 3, strong_yes: 4 },
        }),
        question(DATE_QUESTION_ID, 'date', {
          fieldId: DATE_FIELD_ID,
          valueKind: 'timestamp',
        }),
        question(SCORE_QUESTION_ID, 'score', {
          fieldId: SCORE_FIELD_ID,
          valueKind: 'number',
        }),
        question(DIRECT_NUMBER_QUESTION_ID, 'number', {
          fieldId: DIRECT_NUMBER_FIELD_ID,
          valueKind: 'number',
        }),
        question(CURRENCY_QUESTION_ID, 'currency', {
          fieldId: CURRENCY_FIELD_ID,
          valueKind: 'number',
        }),
        question(ONE_OFF_QUESTION_ID, 'short_answer', null),
      ],
    },
  ],
};

describe('extractSubmissionFieldValues', () => {
  it('emits canonical typed values only for linked reusable fields', () => {
    expect(
      extractSubmissionFieldValues(snapshot, {
        [BOOLEAN_QUESTION_ID]: true,
        [OPTION_QUESTION_ID]: ['platform', 'security'],
        [NUMBER_QUESTION_ID]: 'strong_yes',
        [DATE_QUESTION_ID]: '2026-08-15',
        [SCORE_QUESTION_ID]: { score: 5, comment: 'Strong evidence.' },
        [DIRECT_NUMBER_QUESTION_ID]: 42,
        [CURRENCY_QUESTION_ID]: { amount: 1250, currency: 'USD' },
        [ONE_OFF_QUESTION_ID]: 'encrypted only',
      }),
    ).toEqual([
      {
        questionId: BOOLEAN_QUESTION_ID,
        reusableFieldId: BOOLEAN_FIELD_ID,
        ordinal: 0,
        kind: 'boolean',
        value: true,
      },
      {
        questionId: OPTION_QUESTION_ID,
        reusableFieldId: OPTION_FIELD_ID,
        ordinal: 0,
        kind: 'option',
        value: 'platform',
      },
      {
        questionId: OPTION_QUESTION_ID,
        reusableFieldId: OPTION_FIELD_ID,
        ordinal: 1,
        kind: 'option',
        value: 'security',
      },
      {
        questionId: NUMBER_QUESTION_ID,
        reusableFieldId: NUMBER_FIELD_ID,
        ordinal: 0,
        kind: 'number',
        value: '4',
      },
      {
        questionId: DATE_QUESTION_ID,
        reusableFieldId: DATE_FIELD_ID,
        ordinal: 0,
        kind: 'timestamp',
        value: '2026-08-15T00:00:00.000Z',
      },
      {
        questionId: SCORE_QUESTION_ID,
        reusableFieldId: SCORE_FIELD_ID,
        ordinal: 0,
        kind: 'number',
        value: '5',
      },
      {
        questionId: DIRECT_NUMBER_QUESTION_ID,
        reusableFieldId: DIRECT_NUMBER_FIELD_ID,
        ordinal: 0,
        kind: 'number',
        value: '42',
      },
      {
        questionId: CURRENCY_QUESTION_ID,
        reusableFieldId: CURRENCY_FIELD_ID,
        ordinal: 0,
        kind: 'number',
        value: '1250',
      },
    ]);
  });

  it('omits empty optional answers', () => {
    expect(
      extractSubmissionFieldValues(snapshot, {
        [BOOLEAN_QUESTION_ID]: undefined,
        [OPTION_QUESTION_ID]: [],
        [NUMBER_QUESTION_ID]: '',
        [DATE_QUESTION_ID]: null,
      }),
    ).toEqual([]);
  });

  it('expands numeric values to canonical decimal strings', () => {
    expect(
      extractSubmissionFieldValues(snapshot, {
        [DIRECT_NUMBER_QUESTION_ID]: 0.0000001,
      }),
    ).toEqual([
      {
        questionId: DIRECT_NUMBER_QUESTION_ID,
        reusableFieldId: DIRECT_NUMBER_FIELD_ID,
        ordinal: 0,
        kind: 'number',
        value: '0.0000001',
      },
    ]);

    expect(
      extractSubmissionFieldValues(snapshot, {
        [DIRECT_NUMBER_QUESTION_ID]: 1e21,
      }),
    ).toEqual([
      {
        questionId: DIRECT_NUMBER_QUESTION_ID,
        reusableFieldId: DIRECT_NUMBER_FIELD_ID,
        ordinal: 0,
        kind: 'number',
        value: '1000000000000000000000',
      },
    ]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite numeric values',
    (value) => {
      expect(() => extractSubmissionFieldValues(snapshot, { [DIRECT_NUMBER_QUESTION_ID]: value })).toThrow(
        'Invalid value for "number"',
      );
    },
  );
});

function question(
  id: string,
  questionType: FormDefinitionSnapshot['sections'][number]['questions'][number]['questionType'],
  reusableField: FormDefinitionSnapshot['sections'][number]['questions'][number]['reusableField'],
): FormDefinitionSnapshot['sections'][number]['questions'][number] {
  let selectableValues: Array<{ label: string; value: string }> | null = null;

  if (questionType === 'multiple_choice' && reusableField?.optionValueMap) {
    selectableValues = Object.keys(reusableField.optionValueMap).map((value) => ({ label: value, value }));
  } else if (questionType === 'multiple_choice' || questionType === 'checkboxes') {
    selectableValues = [
      { label: 'Platform', value: 'platform' },
      { label: 'Security', value: 'security' },
    ];
  }

  return {
    id,
    position: 0,
    questionType,
    prompt: questionType,
    description: null,
    isRequired: false,
    isPrivate: false,
    visibility: 'standard',
    isLocked: false,
    selectableValues,
    config: null,
    reusableField,
  };
}
