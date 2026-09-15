import type { CandidateProfile } from '@comitium/schemas/candidates';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  encryptApplication: vi.fn(),
  ensureUnlocked: vi.fn(),
  mutationOptions: null as CandidateProfileMutationOptions | null,
  projectCandidateProfileSearch: vi.fn(),
  updateCandidateProfile: vi.fn(),
}));

vi.mock('@comitium/auth/use-crypto-unlock', () => ({
  useCryptoUnlock: () => ({ ensureUnlocked: mocks.ensureUnlocked }),
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: { encryptApplication: mocks.encryptApplication },
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: CandidateProfileMutationOptions) => {
    mocks.mutationOptions = options;

    return {};
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/lib/api/candidates', () => ({
  updateCandidateProfile: mocks.updateCandidateProfile,
}));

vi.mock('@/lib/candidates/profile-search-projection', () => ({
  projectCandidateProfileSearch: mocks.projectCandidateProfileSearch,
}));

import { useUpdateCandidateProfile } from '../use-update-candidate-profile';

const PROFILE: CandidateProfile = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  linkedIn: null,
  github: null,
  website: null,
  location: { cityId: 2_950_159, city: 'Berlin', region: 'Berlin', country: 'DE' },
  currentTitle: null,
  currentCompany: null,
};

const ENCRYPTED_PROFILE = { purpose: 'candidate_profile' };
const SEARCH_PROJECTION = {
  version: 1,
  contactEmailDigest: '1'.repeat(64),
  locationCityDigest: '2'.repeat(64),
  locationCountryDigest: '3'.repeat(64),
} as const;

interface CandidateProfileMutationParams {
  candidateId: string;
  orgId: string;
  profile: CandidateProfile;
  vaultPublicKey: { v: 1; xwing: string };
  vaultKeyVersion: number;
  wrappedVaultKey: { ek: string };
}

interface CandidateProfileMutationOptions {
  mutationFn: (params: CandidateProfileMutationParams) => Promise<unknown>;
}

describe('candidate profile update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationOptions = null;
    mocks.encryptApplication.mockResolvedValue(ENCRYPTED_PROFILE);
    mocks.projectCandidateProfileSearch.mockResolvedValue(SEARCH_PROJECTION);
  });

  it('sends only the encrypted profile and client-derived search projection', async () => {
    useUpdateCandidateProfile();

    if (!mocks.mutationOptions) {
      throw new Error('Expected candidate profile mutation options');
    }

    await mocks.mutationOptions.mutationFn({
      candidateId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      profile: PROFILE,
      vaultPublicKey: { v: 1, xwing: 'public-key' },
      vaultKeyVersion: 3,
      wrappedVaultKey: { ek: 'wrapped-vault-key' },
    });

    expect(mocks.ensureUnlocked).toHaveBeenCalledOnce();
    expect(mocks.updateCandidateProfile).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      ENCRYPTED_PROFILE,
      SEARCH_PROJECTION,
    );
  });
});
