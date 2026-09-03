import { defineConfig } from '@wagmi/cli';
import type { Abi } from 'viem';

import Erc2771ForwarderAbi from './abis/ERC2771Forwarder.abi.json';
import JobCommitmentAbi from './abis/JobCommitment.abi.json';
import JobFundsAbi from './abis/JobFunds.abi.json';
import OrganizationRegistryAbi from './abis/OrganizationRegistry.abi.json';

export default defineConfig({
  out: 'src/generated/contracts.ts',
  contracts: [
    {
      name: 'ERC2771Forwarder',
      abi: Erc2771ForwarderAbi as Abi,
    },
    {
      name: 'JobCommitment',
      abi: JobCommitmentAbi as Abi,
    },
    {
      name: 'OrganizationRegistry',
      abi: OrganizationRegistryAbi as Abi,
    },
    {
      name: 'JobFunds',
      abi: JobFundsAbi as Abi,
    },
  ],
});
