import { defineConfig } from '@wagmi/cli';
import type { Abi } from 'viem';

import Erc2771ForwarderAbi from './abis/ERC2771Forwarder.abi.json';
import CommitmentFundsAbi from './abis/CommitmentFunds.abi.json';
import OrganizationRegistryAbi from './abis/OrganizationRegistry.abi.json';
import ResponseCommitmentAbi from './abis/ResponseCommitment.abi.json';

export default defineConfig({
  out: 'src/generated/contracts.ts',
  contracts: [
    {
      name: 'ERC2771Forwarder',
      abi: Erc2771ForwarderAbi as Abi,
    },
    {
		name: 'ResponseCommitment',
		abi: ResponseCommitmentAbi as Abi,
    },
    {
      name: 'OrganizationRegistry',
      abi: OrganizationRegistryAbi as Abi,
    },
    {
		name: 'CommitmentFunds',
		abi: CommitmentFundsAbi as Abi,
    },
  ],
});
