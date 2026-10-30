import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getCandidateFiles } from '@/lib/api/candidates';

export function useQueryCandidateFiles(candidateId: string) {
  const unlocked = useIsCryptoActive();

  return useQuery({
    queryKey: qk.candidate.files(candidateId),
    queryFn: () => getCandidateFiles(candidateId),
    enabled: unlocked,
    gcTime: 0,
  });
}
