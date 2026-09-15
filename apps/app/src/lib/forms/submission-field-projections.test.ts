import type { WrappedKey } from '@comitium/schemas/common';
import type { FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ hashCategoricalFormFieldValue: vi.fn() }));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: { hashCategoricalFormFieldValue: mocks.hashCategoricalFormFieldValue },
}));

import { projectSubmissionFieldValues } from './submission-field-projections';

const ORG_ID = '10000000-0000-4000-8000-000000000001';
const BOOLEAN_FIELD_ID = '20000000-0000-4000-8000-000000000001';
const OPTIONS_FIELD_ID = '20000000-0000-4000-8000-000000000002';
const NUMBER_FIELD_ID = '20000000-0000-4000-8000-000000000003';
const DATE_FIELD_ID = '20000000-0000-4000-8000-000000000004';
const BOOLEAN_QUESTION_ID = '30000000-0000-4000-8000-000000000001';
const OPTIONS_QUESTION_ID = '30000000-0000-4000-8000-000000000002';
const NUMBER_QUESTION_ID = '30000000-0000-4000-8000-000000000003';
const DATE_QUESTION_ID = '30000000-0000-4000-8000-000000000004';
const WRAPPED_VAULT_KEY = { ek: 'wrapped-vault-key' } as WrappedKey;

const FORM: FormDefinitionSnapshot = {
  v: 1,
  formId: '40000000-0000-4000-8000-000000000001',
  formClass: 'application',
  title: 'Application',
  capturedAt: '2026-09-13T00:00:00.000Z',
  sections: [
    {
      id: '50000000-0000-4000-8000-000000000001',
      position: 0,
      title: 'Questions',
      questions: [
        question(BOOLEAN_QUESTION_ID, 'yes_no', BOOLEAN_FIELD_ID, 'boolean'),
        question(OPTIONS_QUESTION_ID, 'checkboxes', OPTIONS_FIELD_ID, 'option', [
          { label: 'Platform', value: 'platform', isArchived: false },
          { label: 'Security', value: 'security', isArchived: false },
        ]),
        question(NUMBER_QUESTION_ID, 'number', NUMBER_FIELD_ID, 'number'),
        question(DATE_QUESTION_ID, 'date', DATE_FIELD_ID, 'timestamp'),
      ],
    },
  ],
};

describe('projectSubmissionFieldValues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashCategoricalFormFieldValue.mockImplementation(
      (_orgId: string, _wrappedKey: WrappedKey, _fieldId: string, _kind: string, value: boolean | string) => {
        const digestCharacters = new Map([
          ['true', '1'],
          ['platform', '2'],
          ['security', '3'],
        ]);
        const digestCharacter = digestCharacters.get(String(value));

        if (!digestCharacter) {
          throw new Error(`Unexpected categorical value: ${String(value)}`);
        }

        return Promise.resolve(digestCharacter.repeat(64));
      },
    );
  });

  it('hashes categorical values individually and keeps numeric and date projections typed', async () => {
    const projections = await projectSubmissionFieldValues(ORG_ID, WRAPPED_VAULT_KEY, FORM, {
      [BOOLEAN_QUESTION_ID]: true,
      [OPTIONS_QUESTION_ID]: ['platform', 'security'],
      [NUMBER_QUESTION_ID]: 7.5,
      [DATE_QUESTION_ID]: '2026-10-01',
    });

    expect(mocks.hashCategoricalFormFieldValue).toHaveBeenCalledTimes(3);
    expect(mocks.hashCategoricalFormFieldValue).toHaveBeenNthCalledWith(
      1,
      ORG_ID,
      WRAPPED_VAULT_KEY,
      BOOLEAN_FIELD_ID,
      'boolean',
      true,
    );
    expect(mocks.hashCategoricalFormFieldValue).toHaveBeenNthCalledWith(
      2,
      ORG_ID,
      WRAPPED_VAULT_KEY,
      OPTIONS_FIELD_ID,
      'option',
      'platform',
    );
    expect(mocks.hashCategoricalFormFieldValue).toHaveBeenNthCalledWith(
      3,
      ORG_ID,
      WRAPPED_VAULT_KEY,
      OPTIONS_FIELD_ID,
      'option',
      'security',
    );
    expect(projections).toEqual([
      expect.objectContaining({ reusableFieldId: BOOLEAN_FIELD_ID, ordinal: 0, kind: 'digest' }),
      expect.objectContaining({ reusableFieldId: OPTIONS_FIELD_ID, ordinal: 0, kind: 'digest' }),
      expect.objectContaining({ reusableFieldId: OPTIONS_FIELD_ID, ordinal: 1, kind: 'digest' }),
      expect.objectContaining({ reusableFieldId: NUMBER_FIELD_ID, kind: 'number', value: '7.5' }),
      expect.objectContaining({
        reusableFieldId: DATE_FIELD_ID,
        kind: 'timestamp',
        value: '2026-10-01T00:00:00.000Z',
      }),
    ]);
  });
});

function question(
  id: string,
  questionType: 'yes_no' | 'checkboxes' | 'number' | 'date',
  fieldId: string,
  valueKind: 'boolean' | 'option' | 'number' | 'timestamp',
  selectableValues: Array<{ label: string; value: string; isArchived: boolean }> | null = null,
) {
  return {
    id,
    position: 0,
    questionType,
    prompt: questionType,
    description: null,
    isRequired: false,
    isPrivate: false,
    visibility: 'standard' as const,
    isLocked: false,
    selectableValues,
    config: null,
    reusableField: { fieldId, valueKind },
  };
}
