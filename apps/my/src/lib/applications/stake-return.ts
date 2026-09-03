import { sendProductTransaction } from '@comitium/auth/send-calls';
import type { CanonicalWallet } from '@comitium/auth/wallet';
import { ACTIVE_CHAIN_ID } from '@comitium/chain/chains';
import { resolveJobCommitment } from '@comitium/chain/deployment-catalog';
import { fetchJobCommitmentMaxBatchSize } from '@comitium/chain/job-config';
import type { ApplicantStakeReturnAvailability } from '@comitium/schemas/applications';
import type { Hex } from 'viem';

type ReturnableStakeGroup = ApplicantStakeReturnAvailability['groups'][number];

export async function returnApplicantStakes(wallet: CanonicalWallet, groups: ReturnableStakeGroup[]): Promise<void> {
  const unsupportedGroup = groups.find((group) => group.chainId !== ACTIVE_CHAIN_ID);

  if (unsupportedGroup) {
    throw new Error(`Unsupported applicant stake return chain: ${unsupportedGroup.chainId}`);
  }

  const preparedGroups = await Promise.all(
    groups.map(async (group) => ({
      ...group,
      maxBatchSize: await fetchJobCommitmentMaxBatchSize(group.commitmentContract),
    })),
  );

  for (const group of preparedGroups) {
    const batches = chunkApplicationIds(group.applicationIds, group.maxBatchSize);

    for (const applicationIds of batches) {
      await sendProductTransaction(wallet, {
        chainId: ACTIVE_CHAIN_ID,
        to: group.commitmentContract,
        data: resolveJobCommitment(group.commitmentContract).bindings.encodeWithdrawStakes(applicationIds),
        value: 0n,
      });
    }
  }
}

function chunkApplicationIds(applicationIds: Hex[], maxBatchSize: number): Hex[][] {
  if (!Number.isInteger(maxBatchSize) || maxBatchSize <= 0) {
    throw new Error('Invalid applicant stake return batch size');
  }

  return Array.from({ length: Math.ceil(applicationIds.length / maxBatchSize) }, (_, index) => {
    const start = index * maxBatchSize;

    return applicationIds.slice(start, start + maxBatchSize);
  });
}
