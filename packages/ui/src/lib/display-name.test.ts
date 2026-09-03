import { describe, expect, it } from 'vitest';

import { getCandidateDisplayName } from './display-name';

describe('getCandidateDisplayName', () => {
  it('uses the decrypted candidate profile name first', () => {
    const name = getCandidateDisplayName({
      applicationId: '12345678-0000-4000-8000-000000000000',
      fallbackName: 'Form Name',
      profile: {
        firstName: 'Maya',
        lastName: 'Hayes',
      },
    });

    expect(name).toBe('Maya Hayes');
  });

  it('uses fallback name when profile name is not available', () => {
    const name = getCandidateDisplayName({
      applicationId: '12345678-0000-4000-8000-000000000000',
      fallbackName: 'Form Name',
      profile: null,
    });

    expect(name).toBe('Form Name');
  });

  it('falls back to the application id prefix', () => {
    const name = getCandidateDisplayName({
      applicationId: '12345678-0000-4000-8000-000000000000',
      profile: null,
    });

    expect(name).toBe('Candidate 12345678');
  });

  it('prefers the candidate id prefix over the application id prefix', () => {
    const name = getCandidateDisplayName({
      applicationId: '12345678-0000-4000-8000-000000000000',
      candidateId: '87654321-0000-4000-8000-000000000000',
      profile: null,
    });

    expect(name).toBe('Candidate 87654321');
  });

  it('uses the unknown candidate fallback when nothing is available', () => {
    expect(getCandidateDisplayName({ profile: null })).toBe('Unknown Candidate');
  });
});
