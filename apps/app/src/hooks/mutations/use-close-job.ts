import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { closeJob } from '@/lib/api/jobs';
import { qk } from '../query-keys';
import { invalidateJobQueries, type JobQueryTarget } from './invalidate-job-queries';

type CloseJobParams = JobQueryTarget & { closeReasonId: string; expectedVersion: number };

export function useCloseJob({ onCompleted }: { onCompleted: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (params: CloseJobParams) => closeJob(params.jobId, params.expectedVersion, params.closeReasonId),
    onMutate: () => {
      toast.loading('Closing job...', { id: 'close-job' });
    },
    onSuccess: async (_result, params) => {
      await Promise.all([
        invalidateJobQueries(queryClient, params),
        queryClient.invalidateQueries({ queryKey: qk.pipeline.root() }),
      ]);
      toast.success('Job closed', { id: 'close-job' });
      onCompleted();
    },
    onError: () => {
      toast.error('Failed to close job', { id: 'close-job' });
    },
  });

  return { run: mutation.mutate, isPending: mutation.isPending };
}
