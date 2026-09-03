import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getOwnerActivities, getOwnerActivityOptions, getStageActivities } from '@/lib/api/stage-activities';
import type { StageActivityOwner } from '@/lib/schemas/stage-activities';
import { isDefined } from '@/lib/utils';

export function useQueryStageActivities(jobId?: string, stageId?: string | null) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: qk.stageActivities.stage(jobId, stageId),
    queryFn:
      isAuthenticated && isDefined(jobId) && isDefined(stageId) ? () => getStageActivities(jobId, stageId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}

function ownerQueryKey(owner: StageActivityOwner | null) {
  if (owner === null) {
    return qk.stageActivities.job(undefined);
  }

  if (owner.kind === 'job') {
    return qk.stageActivities.job(owner.jobId);
  }

  return qk.stageActivities.template(owner.orgId, owner.templateId);
}

function ownerOptionsQueryKey(owner: StageActivityOwner | null) {
  if (owner === null) {
    return qk.stageActivities.jobOptions(undefined);
  }

  if (owner.kind === 'job') {
    return qk.stageActivities.jobOptions(owner.jobId);
  }

  return qk.stageActivities.templateOptions(owner.orgId, owner.templateId);
}

export function useQueryOwnerActivities(owner: StageActivityOwner | null) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: ownerQueryKey(owner),
    queryFn: isAuthenticated && owner !== null ? () => getOwnerActivities(owner) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}

export function useQueryOwnerActivityOptions(owner: StageActivityOwner | null) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: ownerOptionsQueryKey(owner),
    queryFn: isAuthenticated && owner !== null ? () => getOwnerActivityOptions(owner) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
