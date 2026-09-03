import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { useSession } from '@comitium/auth/use-session';
import { useActiveWallet } from '@comitium/auth/use-wallet';
import { normalizeAddress } from '@comitium/chain/address';
import { refreshAfterOnchainOperationSettles } from '@comitium/chain/onchain-operation-observer';
import { useOnchainSettlementObserver } from '@comitium/chain/use-onchain-settlement-observer';
import { assertEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import { getErrorMessage } from '@comitium/schemas/error';
import type { CandidateProfileInputValue } from '@comitium/schemas/forms/application-required-fields';
import type { FormSubmissionFieldValue } from '@comitium/schemas/forms/form-submission';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { isJobError } from '@comitium/schemas/product-errors';
import { BACKGROUND_CONFIRMATION_COPY } from '@comitium/ui/action-confirmation';
import { getCommonErrorMessage } from '@comitium/ui/product-error-messages';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Address } from 'viem';
import { qk } from '@/hooks/query-keys';
import type { CandidateIdentityInputValue } from '@/lib/forms/candidate-identity-inputs';
import {
  type ApplyAnswerBucket,
  type ApplyFileUpload,
  type ApplyJobWorkflowParams,
  applyJobWorkflow,
  type WorkflowStep,
} from '@/lib/jobs/workflows/apply-job';

interface SubmitApplicationParams {
  address: Address;
  jobData: JobApplicationData;
  stakeAmount: bigint;
  formId: string;
  answerBuckets: ApplyAnswerBucket[];
  fieldValues: FormSubmissionFieldValue[];
  resumeUpload: { fileId: string; questionId: string; file: File } | null;
  fileUploads: ApplyFileUpload[];
  candidateIdentityInputs: CandidateIdentityInputValue[];
  candidateProfileInput: CandidateProfileInputValue;
  aiCriteriaEvaluation: ApplyJobWorkflowParams['aiCriteriaEvaluation'];
}

const APPLY_TOAST_ID = 'apply-job';

const STEP_MESSAGES: Record<WorkflowStep, string> = {
  encrypting: 'Encrypting application data...',
  signing: 'Requesting signature...',
  submitting: 'Submitting transaction...',
};

function getApplyErrorMessage(error: unknown): string {
  if (!isJobError(error)) {
    return getErrorMessage(error, 'Failed to submit application');
  }

  if (error._tag === 'ValidationError' && error.field === 'eligibility') {
    return error.reason;
  }

  if (error._tag === 'EncryptionError') {
    return 'Failed to encrypt application data. Please try again.';
  }

  if (error._tag === 'SignatureError' && error.apiCode === API_ERROR_CODES.aiCriteriaEvaluationPolicyChanged) {
    return 'The hiring organization changed its AI-assisted evaluation setting. Review the updated choice before submitting again.';
  }

  if (error._tag === 'SignatureError' && !(error.httpStatus >= 400 && error.httpStatus < 500)) {
    return 'Signature request failed. Please try again.';
  }

  if (error._tag === 'ContractError' && error.operation === 'application_confirmation_pending') {
    return 'Your application is still being confirmed. Check My applications again in a moment.';
  }

  return getCommonErrorMessage(error);
}

export function useApplyJob({ onCompleted }: { onCompleted: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const wallet = useActiveWallet();
  const { user } = useSession();
  const settlementObserver = useOnchainSettlementObserver();

  const mutation = useMutation({
    mutationFn: async ({
      address,
      jobData,
      stakeAmount,
      formId,
      answerBuckets,
      fieldValues,
      resumeUpload,
      fileUploads,
      candidateIdentityInputs,
      candidateProfileInput,
      aiCriteriaEvaluation,
    }: SubmitApplicationParams) => {
      if (!isAuthenticated) {
        throw new Error('Not authenticated. Please log in to apply.');
      }

      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      assertEncryptionKeyBundle(user);

      if (
        !user ||
        normalizeAddress(user.walletAddress) !== normalizeAddress(address) ||
        normalizeAddress(wallet.address) !== normalizeAddress(address)
      ) {
        throw new Error(
          'Your authenticated session belongs to another wallet. Re-authenticate with the active wallet.',
        );
      }

      const result = await applyJobWorkflow({
        address,
        jobData,
        stakeAmount,
        formId,
        answerBuckets,
        fieldValues,
        resumeUpload,
        fileUploads,
        candidateIdentityInputs,
        candidateProfileInput,
        aiCriteriaEvaluation,
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
        onCompleted();

        return;
      }

      if (result.kind === 'confirming') {
        toast.info(BACKGROUND_CONFIRMATION_COPY.toast, { id: APPLY_TOAST_ID });
        settlementObserver.observe({
          operationId: result.operationId,
          refresh,
          onCompleted: () => {
            toast.success('Application submitted successfully!', { id: APPLY_TOAST_ID });
            onCompleted();
          },
          onFailed: () => {
            toast.error('Application could not be confirmed. Please try again.', { id: APPLY_TOAST_ID });
          },
        });

        return;
      }

      refreshAfterOnchainOperationSettles(result.operationId, refresh);
      toast.success('Application submitted successfully!', { id: APPLY_TOAST_ID });
      onCompleted();
    },

    onError: async (error: unknown, variables) => {
      queryClient.invalidateQueries({
        queryKey: qk.application.applicantStake(variables.jobData.commitmentContract),
      });

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
