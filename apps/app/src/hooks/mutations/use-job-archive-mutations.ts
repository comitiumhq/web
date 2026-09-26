import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import { archiveJob, restoreJob } from '@/lib/api/jobs';
import { getErrorMessage } from '@/lib/utils';

interface JobArchiveTarget {
  orgId: string;
  jobId: string;
}

function invalidateJobs(queryClient: ReturnType<typeof useQueryClient>, target: JobArchiveTarget) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.jobs.orgRoot(target.orgId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.draftsRoot() }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.detail(target.jobId) }),
  ]);
}

export function useArchiveJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: JobArchiveTarget) => archiveJob(target.orgId, target.jobId),
    onSuccess: async (_, target) => {
      await invalidateJobs(queryClient, target);
      toast.success('Job archived');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRestoreJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: JobArchiveTarget) => restoreJob(target.orgId, target.jobId),
    onSuccess: async (_, target) => {
      await invalidateJobs(queryClient, target);
      toast.success('Job restored');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
