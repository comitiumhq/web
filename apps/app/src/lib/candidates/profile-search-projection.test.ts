import type { CandidateProfile } from '@comitium/schemas/candidates';
import type { WrappedKey } from '@comitium/schemas/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ hashCandidateProfileSearchValue: vi.fn() }));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: { hashCandidateProfileSearchValue: mocks.hashCandidateProfileSearchValue },
}));

import { projectCandidateProfileSearch } from './profile-search-projection';

const ORG_ID = '10000000-0000-4000-8000-000000000001';
const WRAPPED_VAULT_KEY = { ek: 'wrapped-vault-key' } as WrappedKey;

describe('projectCandidateProfileSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashCandidateProfileSearchValue.mockImplementation(
      (_orgId: string, _wrappedKey: WrappedKey, field: string) => {
        const digestCharacters = new Map([
          ['email', 'a'],
          ['cityId', 'b'],
          ['country', 'c'],
        ]);
        const digestCharacter = digestCharacters.get(field);

        if (!digestCharacter) {
          throw new Error(`Unexpected candidate profile field: ${field}`);
        }

        return Promise.resolve(digestCharacter.repeat(64));
      },
    );
  });

  it('projects email, GeoNames city ID, and country without exposing other profile fields', async () => {
    const profile: CandidateProfile = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '+49 30 123456',
      linkedIn: null,
      github: null,
      website: null,
      location: { cityId: 2_950_159, city: 'Berlin', region: 'Berlin', country: 'DE' },
      currentTitle: 'Engineer',
      currentCompany: null,
    };

    const projection = await projectCandidateProfileSearch(ORG_ID, WRAPPED_VAULT_KEY, profile);

    expect(mocks.hashCandidateProfileSearchValue).toHaveBeenCalledTimes(3);
    expect(mocks.hashCandidateProfileSearchValue).toHaveBeenCalledWith(
      ORG_ID,
      WRAPPED_VAULT_KEY,
      'email',
      'ada@example.com',
    );
    expect(mocks.hashCandidateProfileSearchValue).toHaveBeenCalledWith(ORG_ID, WRAPPED_VAULT_KEY, 'cityId', 2_950_159);
    expect(mocks.hashCandidateProfileSearchValue).toHaveBeenCalledWith(ORG_ID, WRAPPED_VAULT_KEY, 'country', 'DE');
    expect(projection).toEqual({
      version: 1,
      contactEmailDigest: 'a'.repeat(64),
      locationCityDigest: 'b'.repeat(64),
      locationCountryDigest: 'c'.repeat(64),
    });
  });

  it('uses null digests when email and location are absent', async () => {
    const projection = await projectCandidateProfileSearch(ORG_ID, WRAPPED_VAULT_KEY, {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      linkedIn: null,
      github: null,
      website: null,
      location: null,
      currentTitle: null,
      currentCompany: null,
    });

    expect(mocks.hashCandidateProfileSearchValue).not.toHaveBeenCalled();
    expect(projection).toEqual({
      version: 1,
      contactEmailDigest: null,
      locationCityDigest: null,
      locationCountryDigest: null,
    });
  });
});
