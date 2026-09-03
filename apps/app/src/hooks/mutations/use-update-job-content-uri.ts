import { requireConnectedWallet } from '@comitium/auth/require-wallet-account';
import { useAccount, useActiveWallet } from '@comitium/auth/use-wallet';
import type { JobSummary } from '@comitium/schemas/jobs';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { prepareJobContentUriUpdate } from '@/lib/api/jobs';
import { submitPreparedRelayedOperation } from '@/lib/onchain-operation-signatures';
import { qk } from '../query-keys';

type UpdateJobContentUriParams = {
  orgId: string;
  jobId: string;
  expectedVersion: number;
  descriptionMarkdown: string;
};

export function useUpdateJobContentUri() {
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const wallet = useActiveWallet();

  return useMutation({
    mutationFn: async (params: UpdateJobContentUriParams) => {
      const { account } = requireConnectedWallet(isConnected, wallet);
      const prepared = await prepareJobContentUriUpdate(params.orgId, params.jobId, {
        expectedVersion: params.expectedVersion,
        descriptionMarkdown: params.descriptionMarkdown,
      });

      await submitPreparedRelayedOperation(params.orgId, prepared, account);
    },
    onMutate: () => {
      toast.loading('Updating job description...', { id: 'update-job-content-uri' });
    },
    onSuccess: async (_result, params) => {
      await queryClient.cancelQueries({ queryKey: qk.jobs.summary(params.jobId), exact: true });

      queryClient.setQueryData<JobSummary>(qk.jobs.summary(params.jobId), (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          description: params.descriptionMarkdown,
          version: params.expectedVersion + 1,
        };
      });

      markJobContentDependentsStale(queryClient);
      toast.success('Changes saved', { id: 'update-job-content-uri' });
    },
    onError: () => {
      toast.error('Failed to update job description', { id: 'update-job-content-uri' });
    },
  });
}

function markJobContentDependentsStale(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.jobs.root(), refetchType: 'none' });
}
