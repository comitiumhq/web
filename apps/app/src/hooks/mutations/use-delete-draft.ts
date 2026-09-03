import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import { deleteDraft } from '@/lib/api/jobs';
import { getErrorMessage } from '@/lib/utils';

export function useDeleteDraft(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => deleteDraft(orgId, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.jobs.draftsRoot() });
      toast.success('Draft deleted');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
