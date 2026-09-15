import { describe, expect, it } from 'vitest';

import { hashCandidateProfileSearchValue } from '../candidate-profile-search-hash';

const VAULT_KEY = new Uint8Array(32).fill(7);
const OTHER_VAULT_KEY = new Uint8Array(32).fill(8);
const ORG_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ORG_ID = '22222222-2222-4222-8222-222222222222';

describe('hashCandidateProfileSearchValue', () => {
  it('preserves the v1 wire contract', () => {
    expect(hashCandidateProfileSearchValue(VAULT_KEY, ORG_ID, 'email', ' Ada@Example.COM ')).toBe(
      '22c4dc3183bc94990ac183df7e83b0f00ec95471f60aa2dd0b8c9776c742f6a9',
    );
  });

  it('normalizes email and country while keeping fields purpose-separated', () => {
    const email = hashCandidateProfileSearchValue(VAULT_KEY, ORG_ID, 'email', ' Ada@Example.COM ');
    const normalizedEmail = hashCandidateProfileSearchValue(VAULT_KEY, ORG_ID, 'email', 'ada@example.com');
    const country = hashCandidateProfileSearchValue(VAULT_KEY, ORG_ID, 'country', ' de ');
    const normalizedCountry = hashCandidateProfileSearchValue(VAULT_KEY, ORG_ID, 'country', 'DE');

    expect(email).toBe(normalizedEmail);
    expect(country).toBe(normalizedCountry);
    expect(hashCandidateProfileSearchValue(VAULT_KEY, ORG_ID, 'email', 'DE')).not.toBe(country);
    expect(email).toMatch(/^[a-f0-9]{64}$/);
  });

  it('binds the digest to the organization vault key', () => {
    const digest = hashCandidateProfileSearchValue(VAULT_KEY, ORG_ID, 'cityId', 2_950_159);

    expect(hashCandidateProfileSearchValue(VAULT_KEY, OTHER_ORG_ID, 'cityId', 2_950_159)).not.toBe(digest);
    expect(hashCandidateProfileSearchValue(OTHER_VAULT_KEY, ORG_ID, 'cityId', 2_950_159)).not.toBe(digest);
  });
});
