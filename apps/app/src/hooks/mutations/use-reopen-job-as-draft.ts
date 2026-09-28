import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { reopenJobAsDraft } from '@/lib/api/jobs';

import { invalidateJobQueries, type JobQueryTarget } from './invalidate-job-queries';

export function useReopenJobAsDraft() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId }: JobQueryTarget) => reopenJobAsDraft(jobId),
    onSuccess: async (_response, params) => {
      await invalidateJobQueries(queryClient, params);

      toast.success('Job reopened as draft');
      await navigate({
        to: '/org/$orgId/jobs/$jobId/settings',
        params: { orgId: params.orgId, jobId: params.jobId },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reopen job as draft');
    },
  });
}
