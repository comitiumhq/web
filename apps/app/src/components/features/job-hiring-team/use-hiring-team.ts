import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { HiringTeamMember, HiringTeamRole } from '@comitium/schemas/jobs';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import {
  addHiringTeamMember,
  getHiringTeam,
  removeHiringTeamMember,
  updateHiringTeamMemberRole,
} from '@/lib/api/jobs-pipeline';
import { isDefined } from '@/lib/utils';

export function useHiringTeam(jobId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<HiringTeamMember[]>({
    queryKey: qk.jobs.hiringTeam(jobId),
    queryFn: isAuthenticated && isDefined(jobId) ? () => getHiringTeam(jobId) : skipToken,
    staleTime: STALE_TIME_SHORT,
  });
}

interface AddMemberParams {
  jobId: string;
  userId: string;
  role: HiringTeamRole;
}

export function useAddHiringTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, userId, role }: AddMemberParams) => addHiringTeamMember(jobId, userId, role),
    onSuccess: (_result, { jobId }) => {
      toast.success('Member added to hiring team');

      queryClient.invalidateQueries({ queryKey: qk.jobs.hiringTeam(jobId) });
      queryClient.invalidateQueries({ queryKey: qk.jobs.accessMe(jobId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateHiringTeamMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, userId, role }: AddMemberParams) => updateHiringTeamMemberRole(jobId, userId, role),
    onSuccess: (_result, { jobId }) => {
      toast.success('Hiring team role updated');

      queryClient.invalidateQueries({ queryKey: qk.jobs.hiringTeam(jobId) });
      queryClient.invalidateQueries({ queryKey: qk.jobs.accessMe(jobId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

interface RemoveMemberParams {
  jobId: string;
  userId: string;
}

export function useRemoveHiringTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, userId }: RemoveMemberParams) => removeHiringTeamMember(jobId, userId),
    onSuccess: (_result, { jobId }) => {
      toast.success('Member removed from hiring team');

      queryClient.invalidateQueries({ queryKey: qk.jobs.hiringTeam(jobId) });
      queryClient.invalidateQueries({ queryKey: qk.jobs.accessMe(jobId) });
      queryClient.invalidateQueries({ queryKey: qk.stageActivities.job(jobId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
