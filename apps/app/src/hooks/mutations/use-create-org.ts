import { useSession } from '@comitium/auth/use-session';
import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { ValidationError } from '@comitium/schemas/product-errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { createOrg } from '@/lib/api/orgs-creation';
import type { OrgCreationStatus } from '@/lib/schemas/org';

const CREATE_ORG_MUTATION_KEY = ['orgs', 'create'] as const;

export function useCreateOrg() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const mutation = useMutation({
    mutationKey: CREATE_ORG_MUTATION_KEY,
    mutationFn: async () => {
      if (!hasEncryptionKeyBundle(user)) {
        throw new ValidationError('account', 'Activate your account before creating an organization.');
      }

      return createOrg();
    },
    onSuccess: ({ organizationId }) => {
      queryClient.setQueryData<OrgCreationStatus>(qk.orgs.creation(), {
        status: 'created',
        organizationId,
        hasActiveMembership: true,
      });
      void queryClient.invalidateQueries({ queryKey: qk.orgs.my() });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: qk.orgs.creation() }),
  });

  return mutation;
}
