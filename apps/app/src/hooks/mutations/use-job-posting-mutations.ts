import type { PublishJobPostingData, UpdateJobPostingData } from '@comitium/schemas/jobs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { publishJobPosting, unpublishJobPosting, updateJobPosting } from '@/lib/api/jobs';
import { invalidateJobQueries, type JobQueryTarget } from './invalidate-job-queries';

export function useUpdateJobPosting(target: JobQueryTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateJobPostingData) => updateJobPosting(target.orgId, target.jobId, data),
    onSuccess: (posting) => {
      queryClient.setQueryData(qk.jobs.posting(target.orgId, target.jobId), posting);
      void invalidateJobQueries(queryClient, target);
      toast.success('Posting settings saved');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save Posting settings'),
  });
}

export function usePublishJobPosting(target: JobQueryTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PublishJobPostingData) => publishJobPosting(target.orgId, target.jobId, data),
    onSuccess: async (posting) => {
      queryClient.setQueryData(qk.jobs.posting(target.orgId, target.jobId), posting);
      await invalidateJobQueries(queryClient, target);
      toast.success('Posting published');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not publish Posting'),
  });
}

export function useUnpublishJobPosting(target: JobQueryTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expectedVersion: number) => unpublishJobPosting(target.orgId, target.jobId, expectedVersion),
    onMutate: () => {
      toast.loading('Unpublishing Posting...', { id: 'unpublish-posting' });
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(qk.jobs.posting(target.orgId, target.jobId), result.posting);
      await invalidateJobQueries(queryClient, target);
      toast.success('Posting unpublished', { id: 'unpublish-posting' });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not unpublish Posting', { id: 'unpublish-posting' });
    },
  });
}
