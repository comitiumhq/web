import type { CreateDraftParams } from '@comitium/schemas/jobs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { invalidateSettingsUsage } from '@/hooks/mutations/invalidate-settings-usage';
import { qk } from '@/hooks/query-keys';
import { createDraft } from '@/lib/api/jobs';
import { getErrorMessage } from '@/lib/utils';

function getSuccessToast(data: CreateDraftParams): string | null {
  if ('sourceJobId' in data) {
    return 'Draft duplicated';
  }

  return null;
}

interface UseCreateDraftOptions {
  navigateOnSuccess?: boolean;
}

export function useCreateDraft(orgId: string, options?: UseCreateDraftOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigateOnSuccess = options?.navigateOnSuccess ?? true;

  return useMutation({
    mutationFn: (data: CreateDraftParams) => createDraft(orgId, data),
    onSuccess: (draft, data) => {
      queryClient.invalidateQueries({ queryKey: qk.jobs.draftsRoot() });
      queryClient.invalidateQueries({ queryKey: qk.interviewPlans.root(orgId) });
      invalidateSettingsUsage(queryClient);

      if (navigateOnSuccess) {
        router.navigate({
          to: '/org/$orgId/jobs/$jobId/details',
          params: { orgId, jobId: draft.id },
        });
      }

      const message = getSuccessToast(data);

      if (message) {
        toast.success(message);
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
