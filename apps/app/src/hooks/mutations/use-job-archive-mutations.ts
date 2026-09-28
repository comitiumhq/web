import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { archiveJob, restoreJob } from '@/lib/api/jobs';
import { getErrorMessage } from '@/lib/utils';
import { invalidateJobQueries, type JobQueryTarget } from './invalidate-job-queries';

export function useArchiveJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: JobQueryTarget) => archiveJob(target.orgId, target.jobId),
    onSuccess: async (_, target) => {
      await invalidateJobQueries(queryClient, target);
      toast.success('Job archived');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRestoreJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: JobQueryTarget) => restoreJob(target.orgId, target.jobId),
    onSuccess: async (_, target) => {
      await invalidateJobQueries(queryClient, target);
      toast.success('Job restored');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
