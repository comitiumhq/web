import type { Address, PublicClient } from 'viem';
import { responseCommitmentAbi } from '../generated/contracts';

type ReadClient = Pick<PublicClient, 'readContract'>;

export const responseCommitmentBindings = {
  commitmentVersion: 1 as const,
  abi: responseCommitmentAbi,
  readCurrentConfigVersion(client: ReadClient, address: Address) {
    return client.readContract({ address, abi: responseCommitmentAbi, functionName: 'currentConfigVersion' });
  },
  readCommitmentConfig(client: ReadClient, address: Address, version: number) {
    return client.readContract({
      address,
      abi: responseCommitmentAbi,
      functionName: 'commitmentConfig',
      args: [version],
    });
  },
  readFeeTiers(client: ReadClient, address: Address, version: number) {
    return client.readContract({ address, abi: responseCommitmentAbi, functionName: 'feeTiers', args: [version] });
  },
};
