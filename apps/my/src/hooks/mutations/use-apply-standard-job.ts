import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { useSession } from '@comitium/auth/use-session';
import { assertEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { API_ERROR_CODES, hasApiErrorCode } from '@comitium/schemas/api-errors';
import { getErrorMessage } from '@comitium/schemas/error';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { type ApplyStandardJobWorkflowParams, applyStandardJobWorkflow } from '@/lib/jobs/workflows/apply-standard-job';

const APPLY_TOAST_ID = 'apply-job';

type SubmitStandardApplicationParams = Omit<ApplyStandardJobWorkflowParams, 'onStep'>;

export function useApplyStandardJob(params: { onCompleted: () => void; onZkIdentityRequired: () => void }) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const { user } = useSession();

  const mutation = useMutation({
    mutationFn: async (input: SubmitStandardApplicationParams) => {
      if (!isAuthenticated) {
        throw new Error('Sign in to apply');
      }

      assertEncryptionKeyBundle(user);

      await applyStandardJobWorkflow({
        ...input,
        onStep: (step) => {
          const message = step === 'encrypting' ? 'Securing application data...' : 'Submitting application...';
          toast.loading(message, { id: APPLY_TOAST_ID });
        },
      });
    },
    onMutate: () => {
      toast.loading('Preparing application...', { id: APPLY_TOAST_ID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.application.my() });
      toast.success('Application submitted successfully!', { id: APPLY_TOAST_ID });
      params.onCompleted();
    },
    onError: (error: unknown) => {
      if (hasApiErrorCode(error, API_ERROR_CODES.zkIdentityRequired)) {
        params.onZkIdentityRequired();
      }

      toast.error(getErrorMessage(error, 'Failed to submit application'), { id: APPLY_TOAST_ID });
    },
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
  };
}
