import type { RenderableForm, RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import { Form } from '@comitium/ui/form';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import type { FormattableTextInputProps } from './form-renderer';
import { FormRenderer } from './form-renderer';
import type { LocationInputProps } from './widgets/location-widget';

const ids = {
  section: '11111111-1111-4111-8111-111111111111',
  firstName: '22222222-2222-4222-8222-222222222222',
  lastName: '33333333-3333-4333-8333-333333333333',
  email: '99999999-9999-4999-8999-999999999999',
  phone: '44444444-4444-4444-8444-444444444444',
  consent: '55555555-5555-4555-8555-555555555555',
  skills: '66666666-6666-4666-8666-666666666666',
  location: '77777777-7777-4777-8777-777777777777',
  notes: '88888888-8888-4888-8888-888888888888',
};

function question(
  id: string,
  prompt: string,
  questionType: RenderableFormQuestion['questionType'],
  overrides: Partial<RenderableFormQuestion> = {},
): RenderableFormQuestion {
  return {
    id,
    position: 0,
    questionType,
    prompt,
    description: null,
    isRequired: false,
    selectableValues: null,
    config: null,
    ...overrides,
  };
}

const form: RenderableForm = {
  sections: [
    {
      id: ids.section,
      position: 0,
      title: 'Application',
      questions: [
        question(ids.phone, 'Phone', 'phone'),
        question(ids.lastName, 'Last name', 'short_answer', {
          config: { candidateProfileField: 'last_name' },
        }),
        question(ids.skills, 'Skills', 'checkboxes', {
          selectableValues: [
            { value: 'react', label: 'React' },
            { value: 'security', label: 'Security' },
          ],
        }),
        question(ids.firstName, 'First name', 'short_answer', {
          config: { candidateProfileField: 'first_name' },
        }),
        question(ids.email, 'Email', 'email'),
        question(ids.consent, 'Available to relocate?', 'yes_no'),
        question(ids.location, 'Location', 'candidate_location'),
        question(ids.notes, 'Notes', 'long_formattable'),
      ],
    },
  ],
};

function LocationInput({ value, onCitySelect }: LocationInputProps) {
  return (
    <button
      type="button"
      onClick={() =>
        onCitySelect(
          {
            id: 616_786,
            name: 'Warsaw',
            admin1: 'Mazovia',
            countryCode: 'PL',
            country: 'Poland',
            population: 1_862_402,
          },
          'Warsaw',
        )
      }
    >
      {value || 'Choose Warsaw'}
    </button>
  );
}

function FormattableTextInput({ name, value, onBlur, onChange }: FormattableTextInputProps) {
  return (
    <textarea aria-label={name} value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} />
  );
}

function Harness() {
  const methods = useForm({
    defaultValues: {
      [ids.firstName]: '',
      [ids.lastName]: '',
      [ids.phone]: '',
      [ids.email]: '',
      [ids.consent]: undefined,
      [ids.skills]: [],
      [ids.location]: undefined,
      [ids.notes]: '',
    },
  });
  const [submission, setSubmission] = useState('');

  return (
    <Form {...methods}>
      <form onSubmit={methods.handleSubmit((values) => setSubmission(JSON.stringify(values)))}>
        <FormRenderer
          form={form}
          control={methods.control}
          locationInput={LocationInput}
          formattableTextInput={FormattableTextInput}
          variant="application"
        />
        <button type="submit">Submit</button>
      </form>
      <output>{submission}</output>
    </Form>
  );
}

describe('FormRenderer', () => {
  it('binds representative text, choice, location, and formattable widgets to one form submission', async () => {
    const screen = await render(<Harness />);

    const nameInputs = screen.getByPlaceholder('Type your answer...');
    await nameInputs.nth(0).fill('Illia');
    await nameInputs.nth(1).fill('Yablonski');
    await screen.getByPlaceholder('name@example.com').fill('candidate@example.com');
    await screen.getByPlaceholder('+1 555 000 0000').fill('++48 abc 123');
    await screen.getByText('Yes').click();
    await screen.getByText('React').click();
    await screen.getByRole('button', { name: 'Choose Warsaw' }).click();
    await screen.getByLabelText(ids.notes).fill('Strong systems background.');
    await screen.getByRole('button', { name: 'Submit' }).click();

    const output = screen.getByRole('status');
    await expect.element(output).toHaveTextContent(`"${ids.firstName}":"Illia"`);
    await expect.element(output).toHaveTextContent(`"${ids.lastName}":"Yablonski"`);
    await expect.element(output).toHaveTextContent(`"${ids.email}":"candidate@example.com"`);
    await expect.element(output).toHaveTextContent(`"${ids.phone}":"+48 123"`);
    await expect.element(output).toHaveTextContent(`"${ids.consent}":true`);
    await expect.element(output).toHaveTextContent(`"${ids.skills}":["react"]`);
    await expect
      .element(output)
      .toHaveTextContent(`"${ids.location}":{"cityId":616786,"city":"Warsaw","country":"PL","region":"Mazovia"}`);
    await expect.element(output).toHaveTextContent(`"${ids.notes}":"Strong systems background."`);
  });
});
