import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import type { CompleteZkIdentityAttemptInput, ZkIdentityApi, ZkIdentityAttempt } from '../../zk-identity';

const TOAST_ID = 'zk-identity-verification';

export function useZkIdentity(api: ZkIdentityApi, queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState<ZkIdentityAttempt | null>(null);

  const close = () => setAttempt(null);

  const statusQuery = useQuery({
    queryKey,
    queryFn: api.getZkIdentityStatus,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const completeAttempt = useMutation({
    mutationFn: ({ attemptId, input }: { attemptId: string; input: CompleteZkIdentityAttemptInput }) =>
      api.completeZkIdentityAttempt(attemptId, input),
    onSuccess: (status) => {
      close();

      if (status.status === 'verified') {
        queryClient.setQueryData(queryKey, status);
      }
    },
    onError: async () => {
      close();
      toast.error('Could not finish identity verification', {
        id: TOAST_ID,
        description: 'The verification service could not confirm the result. Start a new verification and try again.',
      });

      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const createAttempt = useMutation({
    mutationFn: api.createZkIdentityAttempt,
    onMutate: () => completeAttempt.reset(),
    onSuccess: setAttempt,
    onError: () => {
      toast.error('Could not start identity verification', {
        id: TOAST_ID,
        description: 'Check your connection and try again.',
      });
    },
  });

  const complete = async (attemptId: string, input: CompleteZkIdentityAttemptInput) => {
    try {
      const result = await completeAttempt.mutateAsync({ attemptId, input });

      return result.status === 'verified';
    } catch {
      return false;
    }
  };

  const handleError = () => {
    toast.error('Identity verification failed', {
      id: TOAST_ID,
      description: 'The zkPassport app could not complete verification. Try again.',
    });
  };

  const handleReject = () => {
    toast.info('Identity verification cancelled', {
      id: TOAST_ID,
      description: 'No identity information was submitted. You can try again when you are ready.',
    });
  };

  return {
    attempt,
    statusQuery,
    failureCode: completeAttempt.data?.status === 'failed' ? completeAttempt.data.failureCode : null,
    isStarting: createAttempt.isPending,
    start: () => createAttempt.mutate(),
    close,
    complete,
    handleError,
    handleReject,
  };
}
