import type { PublishJobPostingData, UpdateJobPostingData } from '@comitium/schemas/jobs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { publishJobPosting, unpublishJobPosting, updateJobPosting } from '@/lib/api/jobs';

interface JobPostingTarget {
  orgId: string;
  jobId: string;
}

function invalidatePostingQueries(queryClient: ReturnType<typeof useQueryClient>, target: JobPostingTarget) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.jobs.posting(target.orgId, target.jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.summary(target.jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.orgRoot(target.orgId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.draftsOrg(target.orgId) }),
  ]);
}

export function useUpdateJobPosting(target: JobPostingTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateJobPostingData) => updateJobPosting(target.orgId, target.jobId, data),
    onSuccess: async () => {
      await invalidatePostingQueries(queryClient, target);
      toast.success('Posting settings saved');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save Posting settings'),
  });
}

export function usePublishJobPosting(target: JobPostingTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PublishJobPostingData) => publishJobPosting(target.orgId, target.jobId, data),
    onSuccess: async () => {
      await invalidatePostingQueries(queryClient, target);
      toast.success('Posting published');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not publish Posting'),
  });
}

export function useUnpublishJobPosting(target: JobPostingTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expectedVersion: number) => unpublishJobPosting(target.orgId, target.jobId, expectedVersion),
    onSuccess: async () => {
      await invalidatePostingQueries(queryClient, target);
      toast.success('Posting unpublished');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not unpublish Posting'),
  });
}
