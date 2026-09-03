import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import { updateMemberProfile } from '@/lib/api/orgs';
import type { UpdateMemberProfileData } from '@/lib/schemas/org';

export function useUpdateMemberProfile(orgId: string, options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const silent = options?.silent ?? false;

  return useMutation({
    mutationFn: (data: UpdateMemberProfileData) => updateMemberProfile(orgId, data),
    onSuccess: () => {
      if (!silent) {
        toast.success('Profile updated');
      }
      queryClient.invalidateQueries({ queryKey: qk.org.permissions(orgId) });
    },
    onError: (error: Error) => {
      if (!silent) {
        toast.error(error.message || 'Failed to update profile');
      }
    },
  });
}
