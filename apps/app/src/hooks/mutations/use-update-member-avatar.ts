import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { deleteMemberAvatar, type MemberAvatarUpload, uploadMemberAvatar } from '@/lib/api/orgs';
import type { OrgMeResponse } from '@/lib/schemas/org';

export function useUpdateMemberAvatar(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ avatarUrl: string | null }, Error, MemberAvatarUpload | null>({
    mutationFn: async (upload) => (upload ? uploadMemberAvatar(orgId, upload) : deleteMemberAvatar(orgId)),
    onSuccess: ({ avatarUrl }) => {
      queryClient.setQueryData<OrgMeResponse>(qk.org.permissions(orgId), (current) =>
        current ? { ...current, avatarUrl } : current,
      );
      const avatarConsumerKeys = [
        qk.org.team(orgId),
        qk.application.root(),
        qk.application.feedbackSubmissionsRoot(),
        qk.candidate.activityRoot(),
        qk.jobs.root(),
        qk.jobs.detailRoot(),
        qk.stageActivities.root(),
      ];

      for (const queryKey of avatarConsumerKeys) {
        queryClient.invalidateQueries({ queryKey });
      }
      toast.success(avatarUrl ? 'Profile photo updated' : 'Profile photo removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile photo');
    },
  });
}
