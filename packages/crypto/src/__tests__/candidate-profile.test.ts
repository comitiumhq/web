import { describe, expect, it } from 'vitest';
import {
  candidateProfileSchema,
  createCandidateProfile,
  editCandidateProfile,
  mergeCandidateProfile,
} from '../candidate-profile';

const values = {
  firstName: ' Ada ',
  lastName: 'Lovelace',
  email: ' ADA@EXAMPLE.COM ',
  phone: null,
  linkedIn: null,
  github: null,
  website: null,
  location: null,
  currentTitle: null,
  currentCompany: null,
};

describe('Candidate profile source policy', () => {
  it('creates one normalized format with explicit manual-clear metadata', () => {
    const profile = createCandidateProfile({ ...values, website: 'example.com/about' });

    expect(profile).toMatchObject({
      firstName: 'Ada',
      email: 'ada@example.com',
      website: 'https://example.com/about',
      manuallyClearedFields: [],
    });
    expect(candidateProfileSchema.safeParse(values).success).toBe(false);
  });
  it('preserves nonempty values and fills only unprotected null fields', () => {
    const profile = createCandidateProfile(values);

    expect(
      mergeCandidateProfile(profile, { firstName: 'Other', phone: '+123', currentTitle: 'Engineer' }),
    ).toMatchObject({ firstName: 'Ada', phone: '+123', currentTitle: 'Engineer' });
  });
  it('keeps an intentional clear across serialization and repeated enrichment', () => {
    const profile = createCandidateProfile({ ...values, phone: '+123', currentTitle: 'Engineer' });
    const cleared = editCandidateProfile(profile, { ...values, phone: null, currentTitle: 'Engineer' });
    const restored = candidateProfileSchema.parse(JSON.parse(JSON.stringify(cleared)));
    const enriched = mergeCandidateProfile(restored, { phone: '+999', currentCompany: 'Company' });

    expect(enriched).toMatchObject({
      phone: null,
      currentTitle: 'Engineer',
      currentCompany: 'Company',
      manuallyClearedFields: ['phone'],
    });
    expect(mergeCandidateProfile(enriched, { phone: '+999' })).toEqual(enriched);
  });
  it('retains unchanged clear flags and removes one when a user supplies a value', () => {
    const profile = { ...createCandidateProfile(values), manuallyClearedFields: ['phone'] as const };
    const current = candidateProfileSchema.parse(profile);

    expect(editCandidateProfile(current, values).manuallyClearedFields).toEqual(['phone']);
    expect(editCandidateProfile(current, { ...values, phone: '+123' }).manuallyClearedFields).toEqual([]);
  });
  it('rejects invalid clear metadata and unsafe URL schemes', () => {
    const profile = createCandidateProfile(values);

    expect(candidateProfileSchema.safeParse({ ...profile, manuallyClearedFields: ['email'] }).success).toBe(false);
    expect(candidateProfileSchema.safeParse({ ...profile, manuallyClearedFields: ['phone', 'phone'] }).success).toBe(
      false,
    );
    expect(() => createCandidateProfile({ ...values, website: 'javascript:alert(1)' })).toThrow();
    expect(() => createCandidateProfile({ ...values, website: 'https://user:pass@example.com' })).toThrow();
  });
});
