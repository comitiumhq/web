import { describe, expect, it } from 'vitest';

import { parseDecryptedCandidateProfile, parseDecryptedTipTapDoc } from '../decrypted-payloads';

const CANDIDATE_PROFILE = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  linkedIn: null,
  github: null,
  website: null,
  location: null,
  currentTitle: 'Engineer',
  currentCompany: 'Analytical Engines Inc.',
};

describe('decrypted payload parsers', () => {
  it('parses decrypted candidate profiles through the schema', () => {
    expect(parseDecryptedCandidateProfile(CANDIDATE_PROFILE)).toEqual(CANDIDATE_PROFILE);
    expect(parseDecryptedCandidateProfile({ firstName: 'Ada' })).toBeNull();
  });

  it('parses only root TipTap docs', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph' }] };

    expect(parseDecryptedTipTapDoc(doc)).toEqual(doc);
    expect(parseDecryptedTipTapDoc({ type: 'paragraph' })).toBeNull();
    expect(parseDecryptedTipTapDoc(null)).toBeNull();
  });
});
