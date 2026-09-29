import { fetchCurrentResponseCommitmentConfig } from '@comitium/chain/response-commitment-config';
import type { ResponseCommitmentEconomicsConfig } from '@comitium/chain/response-commitment-economics';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';

export function useQueryResponseCommitmentConfig() {
  return useQuery<ResponseCommitmentEconomicsConfig>({
    queryKey: qk.responseCommitmentConfig.current(),
    queryFn: fetchCurrentResponseCommitmentConfig,
    staleTime: STALE_TIME_SHORT,
  });
}
