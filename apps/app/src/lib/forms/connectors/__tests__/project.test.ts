import { describe, expect, it } from 'vitest';

import type { ConnectorRow } from '@/lib/schemas/form-field-connectors';

import { collectProjections, projectAnswer } from '../project';

function makeConnector(overrides: Partial<ConnectorRow> = {}): ConnectorRow {
  return {
    id: 'conn-1',
    formQuestionId: 'q-1',
    questionType: 'short_answer',
    questionPrompt: 'Question',
    fieldId: 'f-1',
    fieldTitle: 'Field',
    fieldType: 'short_answer',
    fieldObjectType: 'candidate',
    fieldIsPrivate: false,
    optionMapping: null,
    unmappedFallback: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('projectAnswer', () => {
  it('passes a string through for same-type text fields', () => {
    const connector = makeConnector();

    expect(projectAnswer('hello', connector, 'short_answer', 'short_answer')).toBe('hello');
  });

  it('passes a string from short_answer to long_unformatted (supported pair)', () => {
    const connector = makeConnector({ questionType: 'short_answer', fieldType: 'long_unformatted' });

    expect(projectAnswer('hello', connector, 'short_answer', 'long_unformatted')).toBe('hello');
  });

  it('returns null for unsupported pair (short_answer → date)', () => {
    const connector = makeConnector({ questionType: 'short_answer', fieldType: 'date' });

    expect(projectAnswer('2026-01-01', connector, 'short_answer', 'date')).toBeNull();
  });

  it('returns null for null / undefined / empty answer', () => {
    const connector = makeConnector();

    expect(projectAnswer(null, connector, 'short_answer', 'short_answer')).toBeNull();
    expect(projectAnswer(undefined, connector, 'short_answer', 'short_answer')).toBeNull();
    expect(projectAnswer('', connector, 'short_answer', 'short_answer')).toBeNull();
  });

  it('passes a string array through for same-type checkboxes', () => {
    const connector = makeConnector({ questionType: 'checkboxes', fieldType: 'checkboxes' });

    expect(projectAnswer(['a', 'b'], connector, 'checkboxes', 'checkboxes')).toEqual(['a', 'b']);
  });

  it('preserves primitive values required by the target field schema', () => {
    const numberConnector = makeConnector({ questionType: 'number', fieldType: 'number' });
    const yesNoConnector = makeConnector({ questionType: 'yes_no', fieldType: 'yes_no' });

    expect(projectAnswer(42, numberConnector, 'number', 'number')).toBe(42);
    expect(projectAnswer('yes', yesNoConnector, 'yes_no', 'yes_no')).toBe('yes');
  });

  it('preserves structured currency and location values', () => {
    const currency = { amount: 1_500, currency: 'USD' };
    const location = { cityId: 1, city: 'Warsaw', country: 'PL' };

    expect(projectAnswer(currency, makeConnector(), 'currency', 'currency')).toEqual(currency);
    expect(projectAnswer(location, makeConnector(), 'location', 'location')).toEqual(location);
  });

  describe('multiple_choice → checkboxes (requires_mapping)', () => {
    it('maps source value into single-element array via optionMapping', () => {
      const connector = makeConnector({
        questionType: 'multiple_choice',
        fieldType: 'checkboxes',
        optionMapping: { tier_1: 'active', tier_2: 'passive' },
      });

      expect(projectAnswer('tier_1', connector, 'multiple_choice', 'checkboxes')).toEqual(['active']);
    });

    it('falls back to unmappedFallback when source value not in mapping', () => {
      const connector = makeConnector({
        questionType: 'multiple_choice',
        fieldType: 'checkboxes',
        optionMapping: { tier_1: 'active' },
        unmappedFallback: 'other',
      });

      expect(projectAnswer('tier_99', connector, 'multiple_choice', 'checkboxes')).toEqual(['other']);
    });

    it('skips (returns null) when not in mapping and no fallback', () => {
      const connector = makeConnector({
        questionType: 'multiple_choice',
        fieldType: 'checkboxes',
        optionMapping: { tier_1: 'active' },
      });

      expect(projectAnswer('tier_99', connector, 'multiple_choice', 'checkboxes')).toBeNull();
    });

    it('returns null when source answer is not a string', () => {
      const connector = makeConnector({
        questionType: 'multiple_choice',
        fieldType: 'checkboxes',
        optionMapping: { tier_1: 'active' },
      });

      expect(projectAnswer(['tier_1'], connector, 'multiple_choice', 'checkboxes')).toBeNull();
    });
  });

  describe('checkboxes → multiple_choice (requires_mapping)', () => {
    it('picks first mapped value from source array', () => {
      const connector = makeConnector({
        questionType: 'checkboxes',
        fieldType: 'multiple_choice',
        optionMapping: { tier_2: 'passive', tier_1: 'active' },
      });

      expect(projectAnswer(['tier_2', 'tier_3'], connector, 'checkboxes', 'multiple_choice')).toBe('passive');
    });

    it('falls back when none mapped', () => {
      const connector = makeConnector({
        questionType: 'checkboxes',
        fieldType: 'multiple_choice',
        optionMapping: { tier_1: 'active' },
        unmappedFallback: 'other',
      });

      expect(projectAnswer(['tier_5', 'tier_9'], connector, 'checkboxes', 'multiple_choice')).toBe('other');
    });

    it('returns null when source is not an array', () => {
      const connector = makeConnector({
        questionType: 'checkboxes',
        fieldType: 'multiple_choice',
        optionMapping: { tier_1: 'active' },
      });

      expect(projectAnswer('tier_1', connector, 'checkboxes', 'multiple_choice')).toBeNull();
    });
  });
});

describe('collectProjections', () => {
  const baseSubmission = {
    id: 'sub-1',
    formId: 'form-1',
    answers: { 'q-1': 'hello', 'q-2': 'world' },
  };

  it('emits an op per matching connector', () => {
    const connectors = [
      makeConnector({ id: 'c-1', formQuestionId: 'q-1', fieldId: 'f-1' }),
      makeConnector({ id: 'c-2', formQuestionId: 'q-2', fieldId: 'f-2' }),
    ];

    const ops = collectProjections({
      submission: baseSubmission,
      connectors,
    });

    expect(ops).toEqual([
      { connectorId: 'c-1', fieldId: 'f-1', fieldType: 'short_answer', value: 'hello' },
      { connectorId: 'c-2', fieldId: 'f-2', fieldType: 'short_answer', value: 'world' },
    ]);
  });

  it('skips connectors whose question has no answer', () => {
    const connectors = [makeConnector({ formQuestionId: 'q-missing', fieldId: 'f-1' })];

    const ops = collectProjections({
      submission: baseSubmission,
      connectors,
    });

    expect(ops).toHaveLength(0);
  });

  it('skips connectors whose projection returns null (unsupported)', () => {
    const connectors = [
      makeConnector({
        id: 'c-1',
        formQuestionId: 'q-1',
        fieldId: 'f-1',
        questionType: 'short_answer',
        fieldType: 'date',
      }),
    ];

    const ops = collectProjections({
      submission: baseSubmission,
      connectors,
    });

    expect(ops).toHaveLength(0);
  });
});
