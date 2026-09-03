import type { RenderableForm, RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import { describe, expect, it } from 'vitest';

import { buildFormSchema } from './build-schema';

const QUESTION_ID = 'question';

function requiredQuestion(
  questionType: RenderableFormQuestion['questionType'],
  selectableValues: RenderableFormQuestion['selectableValues'] = null,
): RenderableFormQuestion {
  return {
    id: QUESTION_ID,
    position: 0,
    questionType,
    prompt: 'Question',
    description: null,
    isRequired: true,
    selectableValues,
    config: null,
  };
}

function schemaFor(question: RenderableFormQuestion) {
  const form: RenderableForm = {
    sections: [
      {
        id: 'section',
        position: 0,
        title: '',
        questions: [question],
      },
    ],
  };

  return buildFormSchema(form);
}

function validationMessage(question: RenderableFormQuestion, value: unknown): string | undefined {
  const result = schemaFor(question).safeParse({ [QUESTION_ID]: value });

  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('buildFormSchema', () => {
  it.each([
    ['candidate_location', undefined, 'Select a location'],
    ['yes_no', undefined, 'Choose Yes or No'],
    ['number', undefined, 'Enter a number'],
    ['currency', { amount: undefined, currency: 'USD' }, 'Enter an amount'],
    ['date', '', 'Select a date'],
    ['score', undefined, 'Select a rating'],
    ['resume', undefined, 'Upload your resume or CV'],
    ['file', undefined, 'Upload a file'],
    ['email', 'not-an-email', 'Enter a valid email address'],
    ['url', 'not-a-url', 'Enter a valid HTTPS URL'],
  ] satisfies [RenderableFormQuestion['questionType'], unknown, string][])(
    'returns product copy for an invalid %s answer',
    (questionType, value, expected) => {
      expect(validationMessage(requiredQuestion(questionType), value)).toBe(expected);
    },
  );

  it('hides enum implementation details for required choices', () => {
    const question = requiredQuestion('multiple_choice', [
      { value: 'first', label: 'First' },
      { value: 'second', label: 'Second' },
    ]);

    expect(validationMessage(question, undefined)).toBe('Select an option');
    expect(validationMessage(question, 'unknown')).toBe('Select an option');
  });

  it('requires HTTPS for URL answers', () => {
    expect(validationMessage(requiredQuestion('url'), 'https://example.com')).toBeUndefined();
    expect(validationMessage(requiredQuestion('url'), 'http://example.com')).toBe('Enter a valid HTTPS URL');
    expect(validationMessage(requiredQuestion('url'), 'https://localhost')).toBe('Enter a valid HTTPS URL');
  });

  it('uses one clear message for required checkbox groups', () => {
    const question = requiredQuestion('checkboxes', [
      { value: 'first', label: 'First' },
      { value: 'second', label: 'Second' },
    ]);

    expect(validationMessage(question, [])).toBe('Select at least one option');
    expect(validationMessage(question, ['unknown'])).toBe('Select at least one option');
  });

  it('does not repeat a question prompt in its required message', () => {
    const question = {
      ...requiredQuestion('long_unformatted'),
      prompt: 'Why are you interested in this role?',
    };

    expect(validationMessage(question, '')).toBe('Answer this question');
  });

  it('accepts canonical currency answers', () => {
    expect(validationMessage(requiredQuestion('currency'), { amount: 1250, currency: 'USD' })).toBeUndefined();
  });

  it('accepts score answers with an optional comment', () => {
    expect(validationMessage(requiredQuestion('score'), { score: 4, comment: 'Strong evidence.' })).toBeUndefined();
  });
});
