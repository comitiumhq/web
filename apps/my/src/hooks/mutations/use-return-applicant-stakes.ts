import { requireConnectedWallet } from '@comitium/auth/require-wallet-account';
import { useAccount } from '@comitium/auth/use-wallet';
import type { ApplicantStakeReturnAvailability } from '@comitium/schemas/applications';
import { TransactionError } from '@comitium/schemas/product-errors';
import { getProductErrorMessage } from '@comitium/ui/product-error-messages';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { returnApplicantStakes } from '@/lib/applications/stake-return';

export function useReturnApplicantStakes(availability: ApplicantStakeReturnAvailability) {
  const queryClient = useQueryClient();
  const { isConnected, wallet } = useAccount();

  const mutation = useMutation({
    mutationFn: async () => {
      const { wallet: connectedWallet } = requireConnectedWallet(isConnected, wallet);

      try {
        await returnApplicantStakes(connectedWallet, availability.groups);
      } catch (error) {
        throw new TransactionError('applicant_stake_return', error);
      }
    },
    onMutate: () => {
      toast.loading('Confirm the deposit return in your wallet…', { id: 'return-applicant-stakes' });
    },
    onSuccess: () => {
      queryClient.setQueryData<ApplicantStakeReturnAvailability>(qk.application.stakeReturn(), {
        count: 0,
        totalAmount: '0',
        groups: [],
      });

      const message = availability.count === 1 ? 'Deposit returned' : 'Deposits returned';

      toast.success(message, { id: 'return-applicant-stakes' });
    },
    onError: (error: unknown) => {
      toast.error(getProductErrorMessage(error, 'Deposits could not be returned. Please try again.'), {
        id: 'return-applicant-stakes',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.application.my() });
    },
  });

  return {
    returnStakes: mutation.mutate,
    isPending: mutation.isPending,
  };
}
