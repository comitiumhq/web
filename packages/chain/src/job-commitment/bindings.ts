import { type Address, encodeFunctionData, type Hex, type PublicClient } from 'viem';
import { jobCommitmentAbi } from '../generated/contracts';

type ReadClient = Pick<PublicClient, 'readContract'>;

export const jobCommitmentBindings = {
  commitmentVersion: 1 as const,
  abi: jobCommitmentAbi,
  encodeWithdrawStakes(applicationIds: readonly Hex[]) {
    return encodeFunctionData({
      abi: jobCommitmentAbi,
      functionName: 'withdrawStakes',
      args: [applicationIds],
    });
  },
  readCurrentConfigVersion(client: ReadClient, address: Address) {
    return client.readContract({ address, abi: jobCommitmentAbi, functionName: 'currentConfigVersion' });
  },
  readJobConfig(client: ReadClient, address: Address, version: number) {
    return client.readContract({ address, abi: jobCommitmentAbi, functionName: 'jobConfig', args: [version] });
  },
  readFeeTiers(client: ReadClient, address: Address, version: number) {
    return client.readContract({ address, abi: jobCommitmentAbi, functionName: 'feeTiers', args: [version] });
  },
  readApplicantStakeAmount(client: ReadClient, address: Address) {
    return client.readContract({ address, abi: jobCommitmentAbi, functionName: 'applicantStakeAmount' });
  },
};
