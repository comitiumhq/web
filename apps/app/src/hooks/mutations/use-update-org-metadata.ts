import { requireWalletAccount } from '@comitium/auth/require-wallet-account';
import { useAccount, useActiveWallet } from '@comitium/auth/use-wallet';
import { normalizeIpfsUri, requireIpfsUri } from '@comitium/schemas/ipfs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { prepareOrgContentUriUpdate } from '@/lib/api/orgs';
import { uploadFile } from '@/lib/ipfs/storage';
import { submitPreparedRelayedOperation } from '@/lib/onchain-operation-signatures';
import type { MyOrg, OrgDetails } from '@/lib/schemas/org';
import { ORG_PROFILE_LOGO_MAX_LENGTH, orgSettingsSchema } from '@/lib/schemas/org-settings-form';
import { qk } from '../query-keys';

export interface OrgMetadataFormData {
  name: string;
  careersSlug: string;
  description: string;
  logoFile: File | null;
  existingLogo: string | null;
  website: string;
}

export function useUpdateOrgMetadata(orgId: string) {
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const wallet = useActiveWallet();

  return useMutation({
    mutationFn: async (data: OrgMetadataFormData) => {
      const account = requireWalletAccount(isConnected, wallet);

      const profile = orgSettingsSchema.parse({
        name: data.name,
        careersSlug: data.careersSlug,
        description: data.description,
        website: data.website,
      });

      let logoCid = normalizeIpfsUri(data.existingLogo, { maxLength: ORG_PROFILE_LOGO_MAX_LENGTH });

      if (data.logoFile) {
        const file = data.logoFile;
        const uploadedLogoUri = await uploadFile(orgId, file);

        logoCid = requireIpfsUri(uploadedLogoUri, {
          maxLength: ORG_PROFILE_LOGO_MAX_LENGTH,
          message: 'Uploaded logo returned an invalid IPFS URI',
        });
      }

      const prepared = await prepareOrgContentUriUpdate(orgId, {
        name: profile.name,
        careersSlug: profile.careersSlug,
        description: profile.description,
        logo: logoCid,
        website: profile.website,
      });

      await submitPreparedRelayedOperation(orgId, prepared, account);

      return { profile: { ...profile, logo: logoCid } };
    },
    onMutate: async () => {
      toast.loading('Saving organization profile...', { id: 'update-org' });
      await Promise.all([
        queryClient.cancelQueries({ queryKey: qk.org.detail(orgId), exact: true }),
        queryClient.cancelQueries({ queryKey: qk.orgs.my(), exact: true }),
      ]);
    },
    onSuccess: ({ profile }) => {
      queryClient.setQueryData<OrgDetails>(qk.org.detail(orgId), (current) => {
        if (!current) {
          return current;
        }

        return { ...current, ...profile };
      });
      queryClient.setQueryData<MyOrg[]>(qk.orgs.my(), (current) =>
        current?.map((org) => {
          if (org.id !== orgId) {
            return org;
          }

          return {
            ...org,
            name: profile.name,
            logo: profile.logo,
            website: profile.website,
          };
        }),
      );
      toast.success('Changes saved', { id: 'update-org' });
    },
    onError: () => {
      toast.error('Failed to update profile', { id: 'update-org' });
    },
  });
}
