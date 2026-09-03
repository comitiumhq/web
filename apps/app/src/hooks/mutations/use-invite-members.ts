import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import type { InviteInput } from '@/lib/api/orgs-invites';
import { inviteMembers } from '@/lib/api/orgs-invites';

interface InviteMembersParams {
  orgId: string;
  invites: InviteInput[];
}

export function useInviteMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, invites }: InviteMembersParams) => inviteMembers(orgId, invites),
    onSuccess: (data, { orgId }) => {
      const sent = data.results.filter((r) => r.status === 'sent').length;
      const alreadyMember = data.results.filter((r) => r.status === 'already_member').length;
      const errors = data.results.filter((r) => r.status === 'error').length;

      if (sent > 0) {
        toast.success(`${sent} invitation${sent > 1 ? 's' : ''} sent`);
      }

      if (alreadyMember > 0) {
        toast.info(`${alreadyMember} already a member`);
      }

      if (errors > 0) {
        toast.error(`${errors} invitation${errors > 1 ? 's' : ''} failed`);
      }

      queryClient.invalidateQueries({ queryKey: qk.org.invites(orgId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
