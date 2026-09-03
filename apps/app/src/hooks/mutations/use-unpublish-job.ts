import { requireConnectedWallet } from '@comitium/auth/require-wallet-account';
import { useAccount, useActiveWallet } from '@comitium/auth/use-wallet';
import { refreshAfterOnchainOperationSettles } from '@comitium/chain/onchain-operation-observer';
import { BACKGROUND_CONFIRMATION_COPY } from '@comitium/ui/action-confirmation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { prepareUnpublishJob } from '@/lib/api/jobs';
import { submitPreparedRelayedOperation } from '@/lib/onchain-operation-signatures';
import { qk } from '../query-keys';

type UnpublishJobParams = {
  orgId: string;
  jobId: string;
};

export function useUnpublishJob({ onCompleted }: { onCompleted: () => void }) {
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const wallet = useActiveWallet();

  const mutation = useMutation({
    mutationFn: async (params: UnpublishJobParams) => {
      const { account } = requireConnectedWallet(isConnected, wallet);
      const prepared = await prepareUnpublishJob(params.jobId);
      await submitPreparedRelayedOperation(params.orgId, prepared, account);

      return prepared;
    },
    onMutate: () => {
      toast.loading('Unpublishing job...', { id: 'unpublish-job' });
    },
    onSuccess: (prepared, params) => {
      const refresh = () => {
        queryClient.invalidateQueries({ queryKey: qk.jobs.summary(params.jobId) });
        queryClient.invalidateQueries({ queryKey: qk.jobs.root() });
        queryClient.invalidateQueries({ queryKey: qk.pipeline.root() });
      };

      refresh();
      toast.info(BACKGROUND_CONFIRMATION_COPY.toast, { id: 'unpublish-job' });
      onCompleted();

      refreshAfterOnchainOperationSettles(prepared.operationId, refresh).then((stage) => {
        if (stage === 'completed') {
          toast.success('Job unpublished', { id: 'unpublish-job' });
        }

        if (stage === 'failed') {
          toast.error('Failed to unpublish job', { id: 'unpublish-job' });
        }
      });
    },
    onError: () => {
      toast.error('Failed to unpublish job', { id: 'unpublish-job' });
    },
  });

  return { run: mutation.mutate, isPending: mutation.isPending };
}
