import { requireConnectedWallet } from '@comitium/auth/require-wallet-account';
import { useAccount, useActiveWallet } from '@comitium/auth/use-wallet';

import { useOnchainSettlementObserver } from '@comitium/chain/use-onchain-settlement-observer';
import { BACKGROUND_CONFIRMATION_COPY } from '@comitium/ui/action-confirmation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { closeJob, prepareJobClose } from '@/lib/api/jobs';
import { submitAndConfirmPreparedRelayedOperation } from '@/lib/onchain-operation-signatures';
import { qk } from '../query-keys';

type CloseJobParams = {
  orgId: string;
  jobId: string;
  closeReasonId: string;
  expectedVersion: number;
  commitmentSettlementRequired: boolean;
};

export function useCloseJob({ onCompleted }: { onCompleted: () => void }) {
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const wallet = useActiveWallet();
  const settlementObserver = useOnchainSettlementObserver();

  const mutation = useMutation({
    mutationFn: async (params: CloseJobParams) => {
      if (!params.commitmentSettlementRequired) {
        await closeJob(params.jobId, params.expectedVersion, params.closeReasonId);

        return { kind: 'closed' as const };
      }

      const { account } = requireConnectedWallet(isConnected, wallet);
      const prepared = await prepareJobClose(params.jobId, params.expectedVersion, params.closeReasonId);
      const confirmation = await submitAndConfirmPreparedRelayedOperation(params.orgId, prepared, account);

      return { kind: 'settlement' as const, prepared, state: confirmation.kind };
    },
    onMutate: () => {
      toast.loading('Closing job...', { id: 'close-job' });
    },
    onSuccess: async (result, params) => {
      const refresh = () => {
        queryClient.invalidateQueries({ queryKey: qk.jobs.summary(params.jobId) });
        queryClient.invalidateQueries({ queryKey: qk.jobs.root() });
        queryClient.invalidateQueries({ queryKey: qk.pipeline.root() });

        if (params.commitmentSettlementRequired) {
          queryClient.invalidateQueries({ queryKey: qk.balance.orgRoot() });
          queryClient.invalidateQueries({ queryKey: qk.balance.orgHistoryRoot() });
          queryClient.invalidateQueries({ queryKey: qk.balance.walletRoot() });
        }
      };
      const complete = () => {
        refresh();
        toast.success('Job closed', { id: 'close-job' });
        onCompleted();
      };

      if (result.kind === 'closed') {
        refresh();
        toast.success('Job closed', { id: 'close-job' });
        onCompleted();

        return;
      }

      if (result.state === 'completed') {
        complete();

        return;
      }

      toast.info(BACKGROUND_CONFIRMATION_COPY.toast, { id: 'close-job' });
      settlementObserver.observe({
        operationId: result.prepared.operationId,
        refresh,
        onCompleted: complete,
        onFailed: () => {
          toast.error('Failed to close job', { id: 'close-job' });
        },
      });
    },
    onError: () => {
      toast.error('Failed to close job', { id: 'close-job' });
    },
  });

  return {
    run: mutation.mutate,
    isPending: mutation.isPending,
    isConfirming: settlementObserver.isConfirming,
  };
}
