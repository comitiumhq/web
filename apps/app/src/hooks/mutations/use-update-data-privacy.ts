import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import { updateDataPrivacySettings } from '@/lib/api/data-privacy';
import type { UpdateDataPrivacySettingsInput } from '@/lib/schemas/data-privacy';

export function useUpdateDataPrivacy(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateDataPrivacySettingsInput) => updateDataPrivacySettings(orgId, body),
    onSuccess: (response) => {
      queryClient.setQueryData(qk.settings.dataPrivacy(orgId), response);
      toast.success('Data and privacy settings updated');
    },
    onError: showMutationError,
  });
}
