import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateOrgProfile, uploadOrgLogo } from '@/lib/api/orgs';
import type { MyOrg, OrgDetails } from '@/lib/schemas/org';
import { orgSettingsSchema } from '@/lib/schemas/org-settings-form';
import { qk } from '../query-keys';
import { invalidateWorkspaceSetup } from './invalidate-workspace-setup';

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

  return useMutation({
    mutationFn: async (data: OrgMetadataFormData) => {
      const profile = orgSettingsSchema.parse({
        name: data.name,
        careersSlug: data.careersSlug,
        description: data.description,
        website: data.website,
      });

      let logo = data.existingLogo;

      if (data.logoFile) {
        const uploaded = await uploadOrgLogo(orgId, data.logoFile);

        logo = uploaded.logo;
      }

      await updateOrgProfile(orgId, {
        name: profile.name,
        careersSlug: profile.careersSlug,
        description: profile.description,
        logo,
        website: profile.website,
      });

      return { ...profile, logo };
    },
    onMutate: async () => {
      toast.loading('Saving organization profile...', { id: 'update-org' });
      await Promise.all([
        queryClient.cancelQueries({ queryKey: qk.org.detail(orgId), exact: true }),
        queryClient.cancelQueries({ queryKey: qk.orgs.my(), exact: true }),
      ]);
    },
    onSuccess: (profile) => {
      invalidateWorkspaceSetup(queryClient, orgId);
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
