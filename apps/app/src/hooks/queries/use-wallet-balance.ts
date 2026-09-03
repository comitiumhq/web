import { useAccount } from '@comitium/auth/use-wallet';
import { usdcToUsd } from '@comitium/chain/job-economics';

import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { qk } from '@/hooks/query-keys';
import { getBalance } from '@/lib/contracts/erc20';

export function useWalletBalance(stakeToken?: Address, enabled = true) {
  const { address } = useAccount();

  const query = useQuery<bigint>({
    queryKey: qk.balance.wallet(stakeToken, address),
    queryFn: stakeToken && address ? () => getBalance(stakeToken, address) : skipToken,
    enabled,
    staleTime: STALE_TIME_SHORT,
  });

  return {
    balance: query.data ?? null,
    balanceUsd: query.data != null ? usdcToUsd(query.data) : null,
    isLoading: query.isLoading,
  };
}
