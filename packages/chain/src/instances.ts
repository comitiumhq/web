import { createPublicClient, http } from 'viem';

import { activeChain } from './chains';
import { CONTRACT_ADDRESS } from './contracts';
import { jobFundsAbi } from './generated/contracts';

export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(),
});

export const jobFundsContract = {
  address: CONTRACT_ADDRESS.JOB_FUNDS,
  abi: jobFundsAbi,
} as const;
