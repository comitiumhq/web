import type { UpdateJobEditorData } from '@comitium/schemas/jobs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateSettingsUsage } from '@/hooks/mutations/invalidate-settings-usage';
import { qk } from '@/hooks/query-keys';
import { getErrorStatus } from '@/lib/api/client';
import { updateJobEditor } from '@/lib/api/jobs';
import { getErrorMessage } from '@/lib/utils';

async function invalidateJobEditorQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
  jobId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.jobs.draftsOrg(orgId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.editor(orgId, jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.posting(orgId, jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.summary(jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.pipeline(jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.stageActivities.job(jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.stageActivities.jobOptions(jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.interviewPlans.root(orgId) }),
  ]);
  invalidateSettingsUsage(queryClient);
}

export function useSaveJobEditor(orgId: string, jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateJobEditorData) => updateJobEditor(orgId, jobId, data),
    onSuccess: () => invalidateJobEditorQueries(queryClient, orgId, jobId),
    onError: (error) => {
      const isVersionConflict = getErrorStatus(error) === 409;
      const message = isVersionConflict
        ? "We couldn't save this Job. Reload the page and try again."
        : getErrorMessage(error);

      toast.error(message);
    },
  });
}
