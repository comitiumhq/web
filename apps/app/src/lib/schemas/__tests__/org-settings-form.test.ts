import { describe, expect, it } from 'vitest';

import { orgSettingsSchema } from '../org-settings-form';

describe('orgSettingsSchema', () => {
  it('trims public organization metadata', () => {
    const parsed = orgSettingsSchema.parse({
      name: '  Acme  ',
      careersSlug: '  Acme-Careers  ',
      description: '  Hiring privately  ',
      website: '  https://acme.com/careers  ',
    });

    expect(parsed).toEqual({
      name: 'Acme',
      careersSlug: 'acme-careers',
      description: 'Hiring privately',
      website: 'https://acme.com/careers',
    });
  });

  it('rejects non-HTTPS website URLs', () => {
    for (const website of [
      'http://localhost:3001',
      'https://localhost:3001',
      'http://acme.com',
      'javascript:alert(1)',
    ]) {
      expect(() =>
        orgSettingsSchema.parse({
          name: 'Acme',
          careersSlug: 'acme',
          description: '',
          website,
        }),
      ).toThrow();
    }
  });

  it('normalizes website URLs without a scheme', () => {
    const parsed = orgSettingsSchema.parse({
      name: 'Acme',
      careersSlug: 'acme',
      description: '',
      website: 'acme.com/careers',
    });

    expect(parsed.website).toBe('https://acme.com/careers');
  });

  it('rejects reserved careers slugs', () => {
    expect(() =>
      orgSettingsSchema.parse({
        name: 'Acme',
        careersSlug: 'jobs',
        description: '',
        website: '',
      }),
    ).toThrow();
  });
});
