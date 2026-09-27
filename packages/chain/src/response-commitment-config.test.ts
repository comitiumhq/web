import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readCurrentResponseCommitmentConfig } from './response-commitment-config';

const mocks = vi.hoisted(() => ({ readContract: vi.fn() }));

vi.mock('@comitium/chain/instances', () => ({
  commitmentFundsContract: { name: 'commitment-funds' },
  publicClient: { readContract: mocks.readContract },
}));

vi.mock('@comitium/chain/deployment-catalog', () => ({
  resolveResponseCommitment: vi.fn(() => ({
    bindings: {
      readCurrentConfigVersion: () => mocks.readContract(),
      readCommitmentConfig: () => mocks.readContract(),
      readFeeTiers: () => mocks.readContract(),
    },
  })),
}));

const mockReadContract = mocks.readContract;

describe('readCurrentResponseCommitmentConfig', () => {
  beforeEach(() => {
    mockReadContract.mockReset();
  });

  it('reads the current config from the current ResponseCommitment', async () => {
    mockReadContract
      .mockResolvedValueOnce('0x1111111111111111111111111111111111111111' as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce({
        minStake: 100_000_000n,
        tierCount: 2,
        maxBatchSize: 100,
        maxStoppedDuration: 7_776_000,
        maxActiveDuration: 31_536_000,
      } as never)
      .mockResolvedValueOnce([
        { baseFee: 25_000_000n, feeBps: 150n, deadlineDays: 3 },
        { baseFee: 35_000_000n, feeBps: 250n, deadlineDays: 7 },
        { baseFee: 99_000_000n, feeBps: 999n, deadlineDays: 99 },
      ] as never);

    const config = await readCurrentResponseCommitmentConfig();

    expect(config.isOk()).toBe(true);

    if (config.isErr()) {
      throw config.error;
    }

    expect(config.value).toEqual({
      version: 2,
      minStake: 100_000_000n,
      tierCount: 2,
      maxBatchSize: 100,
      maxStoppedDuration: 7_776_000,
      maxActiveDuration: 31_536_000,
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

    const config = await readCurrentResponseCommitmentConfig();

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
        maxStoppedDuration: 7_776_000,
        maxActiveDuration: 31_536_000,
      } as never)
      .mockResolvedValueOnce({ not: 'an array' } as never);

    const config = await readCurrentResponseCommitmentConfig();

    expect(config.isErr()).toBe(true);

    if (config.isErr()) {
      expect(config.error._tag).toBe('ContractError');
      expect(config.error.operation).toBe('read_response_commitment_config');
    }
  });

  it('rejects a config whose declared tier count exceeds the returned tiers', async () => {
    mockReadContract
      .mockResolvedValueOnce('0x1111111111111111111111111111111111111111' as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce([100_000_000n, 2, 100, 7_776_000, 31_536_000] as never)
      .mockResolvedValueOnce([[25_000_000n, 150n, 3]] as never);

    const config = await readCurrentResponseCommitmentConfig();

    expect(config.isErr()).toBe(true);

    if (config.isErr()) {
      expect(config.error._tag).toBe('ContractError');
      expect(config.error.operation).toBe('read_response_commitment_config');
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

    const config = await readCurrentResponseCommitmentConfig();

    expect(config.isErr()).toBe(true);
  });
});
