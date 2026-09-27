import { createPublicClient, http } from 'viem';

import { activeChain } from './chains';
import { CONTRACT_ADDRESS } from './contracts';
import { commitmentFundsAbi } from './generated/contracts';

export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(),
});

export const commitmentFundsContract = {
  address: CONTRACT_ADDRESS.COMMITMENT_FUNDS,
  abi: commitmentFundsAbi,
} as const satisfies { address: `0x${string}`; abi: typeof commitmentFundsAbi };
