import { jobFundsContract, publicClient } from '@comitium/chain/instances';
import { parseOnchainAddress, parseOnchainUint, tupleField } from '@comitium/schemas/onchain';
import { ContractError } from '@comitium/schemas/product-errors';
import { ResultAsync } from 'neverthrow';
import type { Address } from 'viem';

export interface OrgBalance {
  operationalBalance: bigint;
  lockedInJobs: bigint;
  available: bigint;
}

export function readOrgBalance(orgId: number): ResultAsync<OrgBalance, ContractError> {
  return ResultAsync.fromPromise(
    (async () => {
      const balance = await publicClient.readContract({
        ...jobFundsContract,
        functionName: 'jobBalance',
        args: [BigInt(orgId)],
      });
      const available = parseOnchainUint(tupleField(balance, 0, 'available'), 'jobBalance.available');
      const lockedInJobs = parseOnchainUint(tupleField(balance, 1, 'stakedInJobs'), 'jobBalance.stakedInJobs');

      return {
        operationalBalance: available + lockedInJobs,
        lockedInJobs,
        available,
      };
    })(),
    (error) => new ContractError('read_org_balance', error),
  );
}

export function readStakeToken(): ResultAsync<Address, ContractError> {
  return ResultAsync.fromPromise(
    (async () => {
      return parseOnchainAddress(
        await publicClient.readContract({
          ...jobFundsContract,
          functionName: 'stakeToken',
        }),
        'stakeToken',
      );
    })(),
    (error) => new ContractError('read_stake_token', error),
  );
}
