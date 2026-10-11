import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyOrg, OrgDetails } from '@/lib/schemas/org';

const mocks = vi.hoisted(() => ({
  cancelQueries: vi.fn(),
  uploadOrgLogo: vi.fn(),
  updateOrgProfile: vi.fn(),
  invalidateQueries: vi.fn(),
  mutationOptions: null as object | null,
  setQueryData: vi.fn(),
  toastSuccess: vi.fn(),
  useMutation: vi.fn((options: object) => {
    mocks.mutationOptions = options;

    return {};
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({
    cancelQueries: mocks.cancelQueries,
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: mocks.setQueryData,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    loading: vi.fn(),
    success: mocks.toastSuccess,
  },
}));

vi.mock('@/lib/api/orgs', () => ({
  uploadOrgLogo: mocks.uploadOrgLogo,
  updateOrgProfile: mocks.updateOrgProfile,
}));

import { useUpdateOrgMetadata } from '../use-update-org-metadata';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const profile = {
  name: 'Comitium',
  careersSlug: 'comitium',
  description: 'Privacy-first ATS',
  logo: 'https://api.comitium.co/v1/orgs/logo',
  website: 'https://comitium.co',
};

interface OrgMetadataMutationOptions {
  mutationFn: (data: {
    name: string;
    careersSlug: string;
    description: string;
    website: string;
    logoFile: File | null;
    existingLogo: string | null;
  }) => Promise<typeof profile>;
  onMutate: () => Promise<void>;
  onSuccess: (updatedProfile: typeof profile) => void;
}

function getMutationOptions(): OrgMetadataMutationOptions {
  useUpdateOrgMetadata(ORG_ID);

  return mocks.mutationOptions as OrgMetadataMutationOptions;
}

describe('organization profile optimistic cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationOptions = null;
    mocks.cancelQueries.mockResolvedValue(undefined);
  });

  it('uploads a new logo before saving its R2 URL in the organization profile', async () => {
    const options = getMutationOptions();
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    mocks.uploadOrgLogo.mockResolvedValue({ logo: profile.logo });

    await options.mutationFn({ ...profile, logoFile: file, existingLogo: null });

    expect(mocks.uploadOrgLogo).toHaveBeenCalledWith(ORG_ID, file);
    expect(mocks.updateOrgProfile).toHaveBeenCalledWith(ORG_ID, profile);
    expect(mocks.uploadOrgLogo.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateOrgProfile.mock.invocationCallOrder[0],
    );
  });

  it('preserves or clears the existing logo without uploading a file', async () => {
    const options = getMutationOptions();

    await options.mutationFn({ ...profile, logoFile: null, existingLogo: profile.logo });
    await options.mutationFn({ ...profile, logoFile: null, existingLogo: null });

    expect(mocks.uploadOrgLogo).not.toHaveBeenCalled();
    expect(mocks.updateOrgProfile).toHaveBeenNthCalledWith(1, ORG_ID, profile);
    expect(mocks.updateOrgProfile).toHaveBeenNthCalledWith(2, ORG_ID, { ...profile, logo: null });
  });

  it('does not save the profile when uploading the logo fails', async () => {
    const options = getMutationOptions();

    mocks.uploadOrgLogo.mockRejectedValueOnce(new Error('Storage unavailable'));

    await expect(
      options.mutationFn({
        ...profile,
        logoFile: new File(['logo'], 'logo.png', { type: 'image/png' }),
        existingLogo: null,
      }),
    ).rejects.toThrow('Storage unavailable');
    expect(mocks.updateOrgProfile).not.toHaveBeenCalled();
  });

  it('cancels stale reads before the mutation can replace the accepted profile state', async () => {
    const options = getMutationOptions();

    await options.onMutate();
    options.onSuccess(profile);

    expect(mocks.cancelQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['org', ORG_ID],
      exact: true,
    });
    expect(mocks.cancelQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['orgs', 'my'],
      exact: true,
    });
    expect(Math.max(...mocks.cancelQueries.mock.invocationCallOrder)).toBeLessThan(
      mocks.setQueryData.mock.invocationCallOrder[0],
    );

    const updateDetails = mocks.setQueryData.mock.calls[0]?.[1] as (current: OrgDetails) => OrgDetails;
    const updateOrgs = mocks.setQueryData.mock.calls[1]?.[1] as (current: MyOrg[]) => MyOrg[];

    expect(updateDetails({ id: ORG_ID, name: 'Old' } as OrgDetails)).toMatchObject(profile);
    expect(updateOrgs([{ id: ORG_ID, name: 'Old' } as MyOrg])).toEqual([
      expect.objectContaining({
        id: ORG_ID,
        name: profile.name,
        logo: profile.logo,
        website: profile.website,
      }),
    ]);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['org', ORG_ID, 'workspace-setup'],
      exact: true,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['org', ORG_ID, 'job-creation-context'],
      exact: true,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(2);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Changes saved', { id: 'update-org' });
  });
});
