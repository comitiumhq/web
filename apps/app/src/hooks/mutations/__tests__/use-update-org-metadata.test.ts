import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyOrg, OrgDetails } from '@/lib/schemas/org';

const mocks = vi.hoisted(() => ({
  cancelQueries: vi.fn(),
  invalidateQueries: vi.fn(),
  mutationOptions: null as object | null,
  refreshAfterSettlement: vi.fn((_operationId: string, _refresh: () => void) => Promise.resolve('completed' as const)),
  setQueryData: vi.fn(),
  toastSuccess: vi.fn(),
  useMutation: vi.fn((options: object) => {
    mocks.mutationOptions = options;

    return {};
  }),
}));

vi.mock('@comitium/chain/onchain-operation-observer', () => ({
  refreshAfterOnchainOperationSettles: mocks.refreshAfterSettlement,
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

vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: () => ({ isConnected: true }),
  useActiveWallet: () => null,
}));

import { useUpdateOrgMetadata } from '../use-update-org-metadata';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const profile = {
  name: 'Comitium',
  careersSlug: 'comitium',
  description: 'Privacy-first ATS',
  logo: 'ipfs://logo',
  website: 'https://comitium.co',
};

interface OrgMetadataMutationOptions {
  onMutate: () => Promise<void>;
  onSuccess: (result: { operationId: string; profile: typeof profile }) => void;
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

  it('cancels stale reads before the mutation can replace the accepted profile state', async () => {
    const options = getMutationOptions();

    await options.onMutate();
    options.onSuccess({ operationId: 'operation-1', profile });

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
    expect(mocks.refreshAfterSettlement).toHaveBeenCalledWith('operation-1', expect.any(Function));
    const refreshAfterSettlement = mocks.refreshAfterSettlement.mock.calls[0]?.[1];
    expect(refreshAfterSettlement).toBeDefined();
    refreshAfterSettlement?.();
    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(4);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Changes saved', { id: 'update-org' });
  });
});
