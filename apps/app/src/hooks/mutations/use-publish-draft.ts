import { requireConnectedWallet } from '@comitium/auth/require-wallet-account';
import { useAccount, useActiveWallet } from '@comitium/auth/use-wallet';
import type { FeeTier } from '@comitium/chain/job-economics';
import { useOnchainSettlementObserver } from '@comitium/chain/use-onchain-settlement-observer';
import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import type { JobDraft } from '@comitium/schemas/jobs';
import { BACKGROUND_CONFIRMATION_COPY } from '@comitium/ui/action-confirmation';
import { getCommonErrorMessage } from '@comitium/ui/product-error-messages';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { getErrorStatus, hasApiErrorCode } from '@/lib/api/client';
import { isJobError } from '@/lib/jobs/index';
import { publishDraftWorkflow } from '@/lib/jobs/workflows/publish-draft';
import { getErrorMessage } from '@/lib/utils';

export interface PublishDraftParams {
  orgId: string;
  jobId: string;
  draft: JobDraft;
  expectedVersion: number;
  stakeUsd: number;
  feeTier: FeeTier;
  maxApplications?: number;
  descriptionMarkdown: string;
}

export function usePublishDraft() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isConnected } = useAccount();
  const wallet = useActiveWallet();
  const settlementObserver = useOnchainSettlementObserver();

  const mutation = useMutation({
    mutationFn: async (params: PublishDraftParams) => {
      const { account } = requireConnectedWallet(isConnected, wallet);

      const result = await publishDraftWorkflow({
        ...params,
        account,
      });

      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
    onMutate: () => {
      toast.loading('Publishing job...', { id: 'publish-draft' });
    },
    onSuccess: (result, params) => {
      const refresh = () => invalidatePublishedJobQueries(queryClient, params);

      const completePublish = async () => {
        refresh();
        toast.success('Job published', { id: 'publish-draft' });

        await router.navigate({
          to: '/org/$orgId/jobs/$jobId/pipeline',
          params: { orgId: params.orgId, jobId: result.id },
          search: { tab: 'active' },
        });
      };

      if (result.state === 'completed') {
        completePublish();

        return;
      }

      toast.info(BACKGROUND_CONFIRMATION_COPY.toast, { id: 'publish-draft' });
      settlementObserver.observe({
        operationId: result.operationId,
        refresh,
        onCompleted: completePublish,
        onFailed: () => {
          toast.error('Job could not be published. Please try again.', { id: 'publish-draft' });
        },
      });
    },
    onError: (error, params) => {
      if (
        hasApiErrorCode(error, [
          API_ERROR_CODES.recruitingPrivacyPolicyRequired,
          API_ERROR_CODES.recruitingControllerNameRequired,
        ])
      ) {
        toast.error(getErrorMessage(error), { id: 'publish-draft' });

        return;
      }

      if (getErrorStatus(error) === 409) {
        queryClient.invalidateQueries({ queryKey: qk.jobs.draft(params.orgId, params.jobId) });
        toast.error('Draft was updated by another session — refresh and try again', { id: 'publish-draft' });

        return;
      }

      if (isJobError(error)) {
        toast.error(getCommonErrorMessage(error), { id: 'publish-draft' });

        return;
      }

      toast.error(getErrorMessage(error), { id: 'publish-draft' });
    },
  });

  return {
    ...mutation,
    isConfirming: settlementObserver.isConfirming,
  };
}

function invalidatePublishedJobQueries(queryClient: QueryClient, params: PublishDraftParams): void {
  queryClient.invalidateQueries({ queryKey: qk.jobs.orgRoot(params.orgId) });
  queryClient.invalidateQueries({ queryKey: qk.jobs.draftsOrg(params.orgId) });
  queryClient.invalidateQueries({ queryKey: qk.jobs.summary(params.jobId) });
  queryClient.invalidateQueries({ queryKey: qk.balance.orgRoot() });
  queryClient.invalidateQueries({ queryKey: qk.balance.orgHistoryRoot() });
}
