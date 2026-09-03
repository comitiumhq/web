import { useSession } from '@comitium/auth/use-session';
import { useAccount } from '@comitium/auth/use-wallet';
import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { ValidationError } from '@comitium/schemas/product-errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { createOrgWorkflow } from '@/lib/orgs/workflows/create-org';
import type { OrgCreationStatus } from '@/lib/schemas/org';

const CREATE_ORG_MUTATION_KEY = ['orgs', 'create'] as const;

export function useCreateOrg() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { user } = useSession();

  const mutation = useMutation({
    mutationKey: CREATE_ORG_MUTATION_KEY,
    mutationFn: async () => {
      if (!hasEncryptionKeyBundle(user)) {
        throw new ValidationError('account', 'Activate your account before creating an organization.');
      }

      if (!address) {
        throw new ValidationError('wallet', 'Connect your wallet before creating an organization.');
      }

      const result = await createOrgWorkflow();

      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
    onSuccess: () => {
      const current = queryClient.getQueryData<OrgCreationStatus>(qk.orgs.creation());

      if (current?.status === 'ready' || current?.status === 'failed') {
        queryClient.setQueryData<OrgCreationStatus>(qk.orgs.creation(), {
          status: 'creating',
          email: current.email,
          domain: current.domain,
        });
      }

      queryClient.invalidateQueries({ queryKey: qk.orgs.creation() });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: qk.orgs.creation() }),
  });

  return mutation;
}
