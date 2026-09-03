import type { RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import { Input } from '@comitium/ui/input';
import type { ChangeEvent } from 'react';
import { useCallback } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';

type TextWidgetProps = {
  question: RenderableFormQuestion;
  field: ControllerRenderProps;
  placeholder?: string;
};

const INPUT_TYPE_BY_QUESTION_TYPE: Partial<Record<RenderableFormQuestion['questionType'], string>> = {
  short_answer: 'text',
  email: 'email',
  phone: 'tel',
  url: 'url',
  number: 'number',
};

const AUTOCOMPLETE_BY_PROFILE_FIELD = {
  first_name: 'given-name',
  last_name: 'family-name',
} as const;

const PHONE_INPUT_ALLOWED_CHARS_REGEX = /[^0-9+\s().-]/g;
const PHONE_INPUT_PATTERN = '[+0-9\\s().-]*';
const PLUS_CHAR_REGEX = /\+/g;

function getAutoComplete(question: RenderableFormQuestion): string | undefined {
  const profileField = question.config?.candidateProfileField;

  if (profileField) {
    return AUTOCOMPLETE_BY_PROFILE_FIELD[profileField];
  }

  if (question.questionType === 'email') {
    return 'email';
  }

  return undefined;
}

function sanitizePhoneInput(value: string): string {
  const stripped = value.replace(PHONE_INPUT_ALLOWED_CHARS_REGEX, '').trimStart();
  const hasLeadingPlus = stripped.startsWith('+');
  const withoutPlus = stripped.replace(PLUS_CHAR_REGEX, '');

  if (hasLeadingPlus) {
    return `+${withoutPlus}`;
  }

  return withoutPlus;
}

export function TextWidget({ question, field, placeholder }: TextWidgetProps) {
  const inputType = INPUT_TYPE_BY_QUESTION_TYPE[question.questionType] ?? 'text';
  const autoComplete = getAutoComplete(question);
  const isNumeric = question.questionType === 'number';
  const isPhone = question.questionType === 'phone';

  const value = field.value ?? '';
  const handleNumberChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.value === '') {
        field.onChange(undefined);

        return;
      }

      const nextValue = Number(e.target.value);

      if (Number.isNaN(nextValue)) {
        return;
      }

      field.onChange(Math.max(0, nextValue));
    },
    [field],
  );
  const handlePhoneChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      field.onChange(sanitizePhoneInput(e.target.value));
    },
    [field],
  );

  if (isNumeric) {
    return (
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        size="lg"
        placeholder={placeholder}
        value={value as string | number | ''}
        onBlur={field.onBlur}
        onChange={handleNumberChange}
        name={field.name}
        ref={field.ref}
        data-form-focus-target=""
      />
    );
  }

  if (isPhone) {
    return (
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={32}
        pattern={PHONE_INPUT_PATTERN}
        size="lg"
        placeholder={placeholder}
        value={value as string}
        onBlur={field.onBlur}
        onChange={handlePhoneChange}
        name={field.name}
        ref={field.ref}
        data-form-focus-target=""
      />
    );
  }

  return (
    <Input
      type={inputType}
      autoComplete={autoComplete}
      size="lg"
      placeholder={placeholder}
      value={value as string}
      onBlur={field.onBlur}
      onChange={field.onChange}
      name={field.name}
      ref={field.ref}
      data-form-focus-target=""
    />
  );
}
