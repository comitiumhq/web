import type { CanonicalWallet } from '@comitium/auth/wallet';
import { ACTIVE_CHAIN_ID } from '@comitium/chain/chains';
import { activeDeployment } from '@comitium/chain/deployment-catalog';
import { jobCommitmentAbi } from '@comitium/chain/generated/contracts';
import { encodeFunctionData, type Hex } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { returnApplicantStakes } from '../stake-return';

const mocks = vi.hoisted(() => ({
  fetchMaxBatchSize: vi.fn(),
  sendProductTransaction: vi.fn(),
}));

vi.mock('@comitium/auth/send-calls', () => ({ sendProductTransaction: mocks.sendProductTransaction }));
vi.mock('@comitium/chain/job-config', () => ({
  fetchJobCommitmentMaxBatchSize: mocks.fetchMaxBatchSize,
}));

const IDS = Array.from({ length: 5 }, (_, index) => `0x${String(index + 1).padStart(64, '0')}` as Hex);
const CONTRACT = activeDeployment.contracts.jobCommitments[0].address;
const wallet = {} as CanonicalWallet;

describe('applicant stake return', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchMaxBatchSize.mockResolvedValue(2);
    mocks.sendProductTransaction.mockResolvedValue(undefined);
  });

  it('submits every contract-sized batch and waits for each confirmed result', async () => {
    await returnApplicantStakes(wallet, [
      {
        chainId: ACTIVE_CHAIN_ID,
        commitmentContract: CONTRACT,
        applicationIds: IDS.slice(0, 3),
      },
    ]);

    expect(mocks.sendProductTransaction).toHaveBeenNthCalledWith(1, wallet, {
      chainId: ACTIVE_CHAIN_ID,
      to: CONTRACT,
      data: encodeFunctionData({
        abi: jobCommitmentAbi,
        functionName: 'withdrawStakes',
        args: [IDS.slice(0, 2)],
      }),
      value: 0n,
    });
    expect(mocks.sendProductTransaction).toHaveBeenNthCalledWith(2, wallet, {
      chainId: ACTIVE_CHAIN_ID,
      to: CONTRACT,
      data: encodeFunctionData({
        abi: jobCommitmentAbi,
        functionName: 'withdrawStakes',
        args: [IDS.slice(2, 3)],
      }),
      value: 0n,
    });
  });

  it('rejects an invalid live contract batch limit before opening the wallet', async () => {
    mocks.fetchMaxBatchSize.mockResolvedValue(0);

    await expect(
      returnApplicantStakes(wallet, [
        {
          chainId: ACTIVE_CHAIN_ID,
          commitmentContract: CONTRACT,
          applicationIds: IDS.slice(0, 1),
        },
      ]),
    ).rejects.toThrow('Invalid applicant stake return batch size');
    expect(mocks.sendProductTransaction).not.toHaveBeenCalled();
  });

  it('rejects a server group for another chain before opening the wallet', async () => {
    await expect(
      returnApplicantStakes(wallet, [
        {
          chainId: ACTIVE_CHAIN_ID + 1,
          commitmentContract: CONTRACT,
          applicationIds: IDS.slice(0, 1),
        },
      ]),
    ).rejects.toThrow(`Unsupported applicant stake return chain: ${ACTIVE_CHAIN_ID + 1}`);
    expect(mocks.sendProductTransaction).not.toHaveBeenCalled();
  });
});
