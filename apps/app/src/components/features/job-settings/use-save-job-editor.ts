import type { UpdateJobEditorData } from '@comitium/schemas/jobs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateJobQueries } from '@/hooks/mutations/invalidate-job-queries';
import { invalidateSettingsUsage } from '@/hooks/mutations/invalidate-settings-usage';
import { qk } from '@/hooks/query-keys';
import { updateJobEditor } from '@/lib/api/jobs';

async function invalidateJobEditorQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
  jobId: string,
  changes: UpdateJobEditorData,
) {
  const planChanged = 'interviewPlanId' in changes;
  const titleChanged = 'title' in changes;
  const affectsSettingsUsage = planChanged || titleChanged || 'formId' in changes;
  const refreshes: Promise<unknown>[] = [invalidateJobQueries(queryClient, { orgId, jobId }, 'active')];

  if (planChanged) {
    refreshes.push(
      queryClient.invalidateQueries({ queryKey: qk.jobs.pipeline(jobId) }),
      queryClient.invalidateQueries({ queryKey: qk.stageActivities.job(jobId) }),
    );
  }

  if (planChanged || titleChanged) {
    refreshes.push(queryClient.invalidateQueries({ queryKey: qk.interviewPlans.root(orgId) }));
  }

  await Promise.all(refreshes);

  if (affectsSettingsUsage) {
    invalidateSettingsUsage(queryClient);
  }
}

export function useSaveJobEditor(orgId: string, jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: qk.jobs.editor(orgId, jobId),
    mutationFn: (data: UpdateJobEditorData) => updateJobEditor(orgId, jobId, data),
    onSuccess: (_, changes) => invalidateJobEditorQueries(queryClient, orgId, jobId, changes),
  });
}
