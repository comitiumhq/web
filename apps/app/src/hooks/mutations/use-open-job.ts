import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { openJob } from '@/lib/api/jobs';
import { qk } from '../query-keys';

interface OpenJobParams {
  orgId: string;
  jobId: string;
}

export function useOpenJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId }: OpenJobParams) => openJob(jobId),
    onSuccess: async (_response, params) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.jobs.summary(params.jobId) }),
        queryClient.invalidateQueries({ queryKey: qk.jobs.detail(params.jobId) }),
        queryClient.invalidateQueries({ queryKey: qk.jobs.orgRoot(params.orgId) }),
        queryClient.invalidateQueries({ queryKey: qk.jobs.draftsOrg(params.orgId) }),
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
