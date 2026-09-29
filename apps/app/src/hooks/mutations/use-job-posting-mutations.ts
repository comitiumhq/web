import { requireConnectedWallet } from '@comitium/auth/require-wallet-account';
import { useAccount, useActiveWallet } from '@comitium/auth/use-wallet';
import { useOnchainSettlementObserver } from '@comitium/chain/use-onchain-settlement-observer';
import type { PrepareCommitmentParams, PublishJobPostingData, UpdateJobPostingData } from '@comitium/schemas/jobs';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import {
  prepareCommitment,
  prepareJobSettlement,
  publishJobPosting,
  unpublishJobPosting,
  updateJobPosting,
} from '@/lib/api/jobs';
import {
  type PreparedRelayedOperation,
  submitAndConfirmPreparedRelayedOperation,
} from '@/lib/onchain-operation-signatures';
import { invalidateJobQueries, type JobQueryTarget } from './invalidate-job-queries';

interface PreparedPostingOperationCopy {
  toastId: string;
  pending: string;
  confirming: string;
  completed: string;
  failed: string;
}

function invalidateCommitmentBalanceQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.balance.orgRoot() }),
    queryClient.invalidateQueries({ queryKey: qk.balance.orgHistoryRoot() }),
  ]);
}

export function useUpdateJobPosting(target: JobQueryTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateJobPostingData) => updateJobPosting(target.orgId, target.jobId, data),
    onSuccess: (posting) => {
      queryClient.setQueryData(qk.jobs.posting(target.orgId, target.jobId), posting);
      void invalidateJobQueries(queryClient, target);
      toast.success('Posting settings saved');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save Posting settings'),
  });
}

export function usePublishJobPosting(target: JobQueryTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PublishJobPostingData) => publishJobPosting(target.orgId, target.jobId, data),
    onSuccess: async (posting) => {
      queryClient.setQueryData(qk.jobs.posting(target.orgId, target.jobId), posting);
      await invalidateJobQueries(queryClient, target);
      toast.success('Posting published');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not publish Posting'),
  });
}

export function useAddResponseCommitment(target: JobQueryTarget) {
  return usePreparedPostingOperation({
    target,
    prepare: (data: PrepareCommitmentParams) => prepareCommitment(target.orgId, target.jobId, data),
    copy: {
      toastId: 'add-response-commitment',
      pending: 'Adding response commitment...',
      confirming: 'Response commitment is being added.',
      completed: 'Response commitment added',
      failed: 'Could not add response commitment',
    },
  });
}

export function useUnpublishJobPosting(target: JobQueryTarget) {
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const wallet = useActiveWallet();
  const settlementObserver = useOnchainSettlementObserver();

  const mutation = useMutation({
    mutationFn: async (expectedVersion: number) => {
      const result = await unpublishJobPosting(target.orgId, target.jobId, expectedVersion);

      if (result.kind === 'completed') {
        return result;
      }

      const { account } = requireConnectedWallet(isConnected, wallet);
      const confirmation = await submitAndConfirmPreparedRelayedOperation(target.orgId, result.operation, account);

      return { ...result, state: confirmation.kind };
    },
    onMutate: () => toast.loading('Unpublishing Posting...', { id: 'unpublish-posting' }),
    onSuccess: async (result) => {
      if (result.kind === 'completed') {
        queryClient.setQueryData(qk.jobs.posting(target.orgId, target.jobId), result.posting);
      }

      const refresh = () => invalidateJobQueries(queryClient, target);
      const showCompleted = () => {
        toast.success('Posting unpublished', { id: 'unpublish-posting' });
      };

      if (result.kind === 'completed' || result.state !== 'confirming') {
        await refresh();
        showCompleted();

        return;
      }

      toast.info('Posting is being unpublished.', { id: 'unpublish-posting' });
      settlementObserver.observe({
        operationId: result.operation.operationId,
        refresh,
        onCompleted: showCompleted,
        onFailed: () => {
          toast.error('Could not unpublish Posting', { id: 'unpublish-posting' });
        },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not unpublish Posting', { id: 'unpublish-posting' });
    },
  });

  return {
    ...mutation,
    isConfirming: settlementObserver.isConfirming,
  };
}

export function useReleaseCommitmentFunds(target: JobQueryTarget) {
  return usePreparedPostingOperation<void>({
    target,
    prepare: () => prepareJobSettlement(target.jobId),
    copy: {
      toastId: 'release-commitment-funds',
      pending: 'Releasing funds...',
      confirming: 'Funds are being released.',
      completed: 'Funds released',
      failed: 'Could not release funds',
    },
  });
}

function usePreparedPostingOperation<TInput>(params: {
  target: JobQueryTarget;
  prepare: (input: TInput) => Promise<PreparedRelayedOperation>;
  copy: PreparedPostingOperationCopy;
}) {
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const wallet = useActiveWallet();
  const settlementObserver = useOnchainSettlementObserver();

  const mutation = useMutation({
    mutationFn: async (input: TInput) => {
      const { account } = requireConnectedWallet(isConnected, wallet);
      const operation = await params.prepare(input);
      const confirmation = await submitAndConfirmPreparedRelayedOperation(params.target.orgId, operation, account);

      return { operation, state: confirmation.kind };
    },
    onMutate: () => toast.loading(params.copy.pending, { id: params.copy.toastId }),
    onSuccess: async (result) => {
      const refresh = async () => {
        await Promise.all([
          invalidateJobQueries(queryClient, params.target),
          invalidateCommitmentBalanceQueries(queryClient),
        ]);
      };
      const showCompleted = () => {
        toast.success(params.copy.completed, { id: params.copy.toastId });
      };

      if (result.state !== 'confirming') {
        await refresh();
        showCompleted();

        return;
      }

      toast.info(params.copy.confirming, { id: params.copy.toastId });
      settlementObserver.observe({
        operationId: result.operation.operationId,
        refresh,
        onCompleted: showCompleted,
        onFailed: () => {
          toast.error(params.copy.failed, { id: params.copy.toastId });
        },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || params.copy.failed, { id: params.copy.toastId });
    },
  });

  return {
    ...mutation,
    isConfirming: settlementObserver.isConfirming,
  };
}
