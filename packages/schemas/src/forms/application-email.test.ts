import { describe, expect, it } from 'vitest';
import { resolveApplicationResponseEmail } from './application-email';
import { orderApplicationRequiredQuestionsFirst } from './application-required-fields';
import type { NestedForm } from './form-definitions';

const form: Pick<NestedForm, 'sections'> = {
  sections: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      position: 0,
      title: 'Contact',
      questions: [
        {
          id: '22222222-2222-4222-8222-222222222222',
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
      ],
    },
  ],
};

describe('resolveApplicationResponseEmail', () => {
  it('keeps the locked email as the contact field when an additional email precedes it', () => {
    const email = form.sections[0].questions[0];
    const additional = {
      ...email,
      id: 'additional-email',
      isLocked: false,
      isRequired: false,
      isPrivate: true,
      visibility: 'private' as const,
    };
    const firstName = {
      ...email,
      id: 'first-name',
      questionType: 'short_answer' as const,
      config: { candidateProfileField: 'first_name' as const },
    };
    const lastName = { ...firstName, id: 'last-name', config: { candidateProfileField: 'last_name' as const } };
    const questions = [additional, lastName, email, firstName];

    expect(orderApplicationRequiredQuestionsFirst(questions).map((question) => question.id)).toEqual([
      firstName.id,
      lastName.id,
      email.id,
      additional.id,
    ]);
    expect(
      resolveApplicationResponseEmail({
        profileEmail: null,
        form: { sections: [{ ...form.sections[0], questions }] },
        values: { [email.id]: 'candidate@example.com', [additional.id]: 'reference@example.com' },
      }),
    ).toBe('candidate@example.com');
  });

  it('prefers the decrypted candidate profile email', () => {
    const email = resolveApplicationResponseEmail({
      profileEmail: ' profile@example.com ',
      form,
      values: { '22222222-2222-4222-8222-222222222222': 'form@example.com' },
    });

    expect(email).toBe('profile@example.com');
  });

  it('falls back to the decrypted application form email', () => {
    const email = resolveApplicationResponseEmail({
      profileEmail: null,
      form,
      values: { '22222222-2222-4222-8222-222222222222': ' form@example.com ' },
    });

    expect(email).toBe('form@example.com');
  });

  it('returns null without a decrypted email source', () => {
    const email = resolveApplicationResponseEmail({
      profileEmail: null,
      form: null,
      values: null,
    });

    expect(email).toBeNull();
  });
});
