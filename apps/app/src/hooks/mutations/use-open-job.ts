import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { openJob } from '@/lib/api/jobs';
import { qk } from '../query-keys';
import { invalidateJobQueries, type JobQueryTarget } from './invalidate-job-queries';

export function useOpenJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId }: JobQueryTarget) => openJob(jobId),
    onSuccess: async (_response, params) => {
      await Promise.all([
        invalidateJobQueries(queryClient, params),
        queryClient.invalidateQueries({ queryKey: qk.pipeline.root() }),
      ]);

      toast.success('Job opened');
      await navigate({
        to: '/org/$orgId/jobs/$jobId/pipeline',
        params: { orgId: params.orgId, jobId: params.jobId },
        search: { tab: 'active' },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to open job');
    },
  });
}
