import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import type { CandidateResponse } from '@comitium/schemas/candidates';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getCandidate } from '@/lib/api/candidates';

export function useQueryCandidate(candidateId?: string | null) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<CandidateResponse>({
    queryKey: qk.candidate.detail(candidateId),
    queryFn: candidateId ? () => getCandidate(candidateId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    enabled: isAuthenticated,
  });
}
