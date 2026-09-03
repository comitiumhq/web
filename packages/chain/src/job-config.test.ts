import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readCurrentJobConfig } from './job-config';

const mocks = vi.hoisted(() => ({ readContract: vi.fn() }));

vi.mock('@comitium/chain/instances', () => ({
  jobFundsContract: { name: 'job-funds' },
  publicClient: { readContract: mocks.readContract },
}));

vi.mock('@comitium/chain/deployment-catalog', () => ({
  resolveJobCommitment: vi.fn(() => ({
    bindings: {
      readCurrentConfigVersion: () => mocks.readContract(),
      readJobConfig: () => mocks.readContract(),
      readFeeTiers: () => mocks.readContract(),
      readApplicantStakeAmount: () => mocks.readContract(),
    },
  })),
}));

const mockReadContract = mocks.readContract;

describe('readCurrentJobConfig', () => {
  beforeEach(() => {
    mockReadContract.mockReset();
  });

  it('reads the current job config from the current JobCommitment', async () => {
    mockReadContract
      .mockResolvedValueOnce('0x1111111111111111111111111111111111111111' as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce({
        minStake: 100_000_000n,
        tierCount: 2,
        maxBatchSize: 100,
        maxUnpublishedDuration: 7_776_000,
        maxPublishedDuration: 31_536_000,
      } as never)
      .mockResolvedValueOnce([
        { baseFee: 25_000_000n, feeBps: 150n, deadlineDays: 3 },
        { baseFee: 35_000_000n, feeBps: 250n, deadlineDays: 7 },
        { baseFee: 99_000_000n, feeBps: 999n, deadlineDays: 99 },
      ] as never);

    const config = await readCurrentJobConfig();

    expect(config.isOk()).toBe(true);

    if (config.isErr()) {
      throw config.error;
    }

    expect(config.value).toEqual({
      version: 2,
      minStake: 100_000_000n,
      tierCount: 2,
      maxBatchSize: 100,
      maxUnpublishedDuration: 7_776_000,
      maxPublishedDuration: 31_536_000,
      feeTiers: [
        { index: 0, baseFee: 25_000_000n, feeBps: 150n, deadlineDays: 3 },
        { index: 1, baseFee: 35_000_000n, feeBps: 250n, deadlineDays: 7 },
      ],
    });
  });

  it('supports positional tuple values from contract reads', async () => {
    mockReadContract
      .mockResolvedValueOnce('0x1111111111111111111111111111111111111111' as never)
      .mockResolvedValueOnce(3 as never)
      .mockResolvedValueOnce([100_000_000n, 1, 100, 7_776_000, 31_536_000] as never)
      .mockResolvedValueOnce([[25_000_000n, 150n, 3]] as never);

    const config = await readCurrentJobConfig();

    expect(config.isOk()).toBe(true);

    if (config.isErr()) {
      throw config.error;
    }

    expect(config.value).toMatchObject({
      version: 3,
      minStake: 100_000_000n,
      tierCount: 1,
      feeTiers: [{ index: 0, baseFee: 25_000_000n, feeBps: 150n, deadlineDays: 3 }],
    });
  });

  it('returns ContractError when on-chain config shape is invalid', async () => {
    mockReadContract
      .mockResolvedValueOnce('0x1111111111111111111111111111111111111111' as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce({
        minStake: 100_000_000n,
        tierCount: 2,
        maxBatchSize: 100,
        maxUnpublishedDuration: 7_776_000,
        maxPublishedDuration: 31_536_000,
      } as never)
      .mockResolvedValueOnce({ not: 'an array' } as never);

    const config = await readCurrentJobConfig();

    expect(config.isErr()).toBe(true);

    if (config.isErr()) {
      expect(config.error._tag).toBe('ContractError');
      expect(config.error.operation).toBe('read_job_config');
    }
  });

  it('rejects a config whose declared tier count exceeds the returned tiers', async () => {
    mockReadContract
      .mockResolvedValueOnce('0x1111111111111111111111111111111111111111' as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce([100_000_000n, 2, 100, 7_776_000, 31_536_000] as never)
      .mockResolvedValueOnce([[25_000_000n, 150n, 3]] as never);

    const config = await readCurrentJobConfig();

    expect(config.isErr()).toBe(true);

    if (config.isErr()) {
      expect(config.error._tag).toBe('ContractError');
      expect(config.error.operation).toBe('read_job_config');
    }
  });

  it.each([
    ['negative minimum stake', [-1n, 1, 100, 7_776_000, 31_536_000]],
    ['unsafe tier count', [100_000_000n, Number.MAX_SAFE_INTEGER + 1, 100, 7_776_000, 31_536_000]],
  ])('rejects malformed numeric config: %s', async (_label, invalidConfig) => {
    mockReadContract
      .mockResolvedValueOnce('0x1111111111111111111111111111111111111111' as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce(invalidConfig as never)
      .mockResolvedValueOnce([[25_000_000n, 150n, 3]] as never);

    const config = await readCurrentJobConfig();

    expect(config.isErr()).toBe(true);
  });
});
