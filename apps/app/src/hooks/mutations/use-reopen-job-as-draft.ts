import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { reopenJobAsDraft } from '@/lib/api/jobs';

import { qk } from '../query-keys';

interface ReopenJobAsDraftParams {
  orgId: string;
  jobId: string;
}

export function useReopenJobAsDraft() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId }: ReopenJobAsDraftParams) => reopenJobAsDraft(jobId),
    onSuccess: async (_response, params) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.jobs.summary(params.jobId) }),
        queryClient.invalidateQueries({ queryKey: qk.jobs.detail(params.jobId) }),
        queryClient.invalidateQueries({ queryKey: qk.jobs.orgRoot(params.orgId) }),
        queryClient.invalidateQueries({ queryKey: qk.jobs.draftsOrg(params.orgId) }),
      ]);

      toast.success('Job reopened as draft');
      await navigate({
        to: '/org/$orgId/jobs/$jobId/details',
        params: { orgId: params.orgId, jobId: params.jobId },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reopen job as draft');
    },
  });
}
