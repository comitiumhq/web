import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { useSession } from '@comitium/auth/use-session';
import { useActiveWallet } from '@comitium/auth/use-wallet';
import { normalizeAddress } from '@comitium/chain/address';
import { refreshAfterOnchainOperationSettles } from '@comitium/chain/onchain-operation-observer';
import { useOnchainSettlementObserver } from '@comitium/chain/use-onchain-settlement-observer';
import { assertEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { API_ERROR_CODES, hasApiErrorCode } from '@comitium/schemas/api-errors';
import { getErrorMessage } from '@comitium/schemas/error';
import type { CandidateProfileInputValue } from '@comitium/schemas/forms/application-required-fields';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { isJobError } from '@comitium/schemas/product-errors';
import { getCommonErrorMessage } from '@comitium/ui/product-error-messages';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import type { CandidateIdentityInputValue } from '@/lib/forms/candidate-identity-inputs';
import type { ApplyAnswerBucket, ApplyFileUpload } from '@/lib/jobs/workflows/application-intake';
import { type ApplyJobWorkflowParams, applyJobWorkflow, type WorkflowStep } from '@/lib/jobs/workflows/apply-job';

interface SubmitApplicationParams {
  jobData: JobApplicationData;
  formId: string;
  answerBuckets: ApplyAnswerBucket[];
  resumeUpload: { fileId: string; questionId: string; file: File } | null;
  fileUploads: ApplyFileUpload[];
  candidateIdentityInputs: CandidateIdentityInputValue[];
  candidateProfileInput: CandidateProfileInputValue;
  aiCriteriaEvaluation: ApplyJobWorkflowParams['aiCriteriaEvaluation'];
}

const APPLY_TOAST_ID = 'apply-job';

const STEP_MESSAGES: Record<WorkflowStep, string> = {
  encrypting: 'Securing application data...',
  signing: 'Preparing application...',
  submitting: 'Submitting application...',
};

function getApplyErrorMessage(error: unknown): string {
  if (!isJobError(error)) {
    return getErrorMessage(error, 'Failed to submit application');
  }

  if (error._tag === 'ValidationError') {
    return error.reason;
  }

  if (error._tag === 'EncryptionError') {
    return 'Failed to secure application data. Please try again.';
  }

  if (error._tag === 'SignatureError' && error.apiCode === API_ERROR_CODES.aiCriteriaEvaluationPolicyChanged) {
    return 'The hiring organization changed its AI-assisted evaluation setting. Review the updated choice before submitting again.';
  }

  if (error._tag === 'SignatureError' && !(error.httpStatus >= 400 && error.httpStatus < 500)) {
    return 'Application submission could not be prepared. Please try again.';
  }

  if (error._tag === 'ContractError' && error.operation === 'application_confirmation_pending') {
    return 'Your application is still being submitted. Check My applications again in a moment.';
  }

  return getCommonErrorMessage(error);
}

export function useApplyJob(params: { onCompleted: () => void; onZkIdentityRequired: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const wallet = useActiveWallet();
  const { user } = useSession();
  const settlementObserver = useOnchainSettlementObserver();

  const mutation = useMutation({
    mutationFn: async (input: SubmitApplicationParams) => {
      if (!isAuthenticated) {
        throw new Error('Sign in to apply');
      }

      assertEncryptionKeyBundle(user);

      const walletReady = Boolean(
        wallet && user?.walletAddress && normalizeAddress(wallet.address) === normalizeAddress(user.walletAddress),
      );

      const result = await applyJobWorkflow({
        ...input,
        walletReady,
        onStep: (step) => {
          toast.loading(STEP_MESSAGES[step], { id: APPLY_TOAST_ID });
        },
      });

      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },

    onMutate: () => {
      toast.loading('Preparing application...', { id: APPLY_TOAST_ID });
    },

    onSuccess: (result) => {
      const refresh = () => invalidateApplicationQueries(queryClient);

      if (result.kind === 'completed') {
        refresh();
        toast.success('Application submitted successfully!', { id: APPLY_TOAST_ID });
        params.onCompleted();

        return;
      }

      if (result.kind === 'confirming') {
        toast.info('Application submission is being completed.', { id: APPLY_TOAST_ID });

        settlementObserver.observe({
          operationId: result.operationId,
          refresh,
          onCompleted: () => {
            toast.success('Application submitted successfully!', { id: APPLY_TOAST_ID });
            params.onCompleted();
          },
          onFailed: () => {
            toast.error('Application could not be submitted. Please try again.', { id: APPLY_TOAST_ID });
          },
        });

        return;
      }

      refreshAfterOnchainOperationSettles(result.operationId, refresh);
      toast.success('Application submitted successfully!', { id: APPLY_TOAST_ID });
      params.onCompleted();
    },

    onError: async (error: unknown) => {
      if (hasApiErrorCode(error, API_ERROR_CODES.zkIdentityRequired)) {
        params.onZkIdentityRequired();
      }

      if (
        isJobError(error) &&
        error._tag === 'SignatureError' &&
        error.apiCode === API_ERROR_CODES.aiCriteriaEvaluationPolicyChanged
      ) {
        await queryClient.invalidateQueries({ queryKey: qk.careers.all(), refetchType: 'none' });
        await router.invalidate();
      }

      toast.error(getApplyErrorMessage(error), { id: APPLY_TOAST_ID });
    },
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isConfirming: settlementObserver.isConfirming,
  };
}

function invalidateApplicationQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.application.my() });
}
