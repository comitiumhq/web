import type { UpdateDraftData } from '@comitium/schemas/jobs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateSettingsUsage } from '@/hooks/mutations/invalidate-settings-usage';
import { qk } from '@/hooks/query-keys';
import { getErrorStatus } from '@/lib/api/client';
import { updateDraft } from '@/lib/api/jobs';
import { getErrorMessage } from '@/lib/utils';

async function invalidateDraftQueries(queryClient: ReturnType<typeof useQueryClient>, orgId: string, jobId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.jobs.draftsOrg(orgId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.draft(orgId, jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.summary(jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.pipeline(jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.stageActivities.job(jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.stageActivities.jobOptions(jobId) }),
    queryClient.invalidateQueries({ queryKey: qk.interviewPlans.root(orgId) }),
  ]);
  invalidateSettingsUsage(queryClient);
}

export function useSaveDraft(orgId: string, jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDraftData) => updateDraft(orgId, jobId, data),
    onSuccess: () => invalidateDraftQueries(queryClient, orgId, jobId),
    onError: (error) => {
      const isVersionConflict = getErrorStatus(error) === 409;
      const message = isVersionConflict
        ? "We couldn't save this draft. Reload the page and try again."
        : getErrorMessage(error);

      toast.error(message);
    },
  });
}
