import { describe, expect, it } from 'vitest';
import { resolveApplicationResponseEmail } from './application-email';
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
