import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ readContract: vi.fn() }));

vi.mock('@comitium/chain/instances', () => ({
  jobFundsContract: { address: '0x0000000000000000000000000000000000000002', abi: [] },
  publicClient: { readContract: mocks.readContract },
}));

const { readOrgBalance } = await import('../core/balance');

function mockOrgData(operationalBalance: bigint, lockedInJobs: bigint) {
  mocks.readContract.mockResolvedValue({
    available: operationalBalance - lockedInJobs,
    stakedInJobs: lockedInJobs,
  });
}

describe('orgs/balance', () => {
  describe('readOrgBalance', () => {
    it('calculates available = operational - locked', async () => {
      mockOrgData(1_000_000_000n, 400_000_000n);
      const result = await readOrgBalance(1);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.operationalBalance).toBe(1_000_000_000n);
        expect(result.value.lockedInJobs).toBe(400_000_000n);
        expect(result.value.available).toBe(600_000_000n);
      }
    });

    it('zero locked → available equals operational', async () => {
      mockOrgData(1_000_000_000n, 0n);
      const result = await readOrgBalance(1);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.available).toBe(1_000_000_000n);
      }
    });

    it('fully locked → available is zero', async () => {
      mockOrgData(500_000_000n, 500_000_000n);
      const result = await readOrgBalance(1);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.available).toBe(0n);
      }
    });

    it('derives operational balance from available + locked', async () => {
      mockOrgData(700_000_000n, 600_000_000n);
      const result = await readOrgBalance(1);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.operationalBalance).toBe(700_000_000n);
        expect(result.value.lockedInJobs).toBe(600_000_000n);
        expect(result.value.available).toBe(100_000_000n);
      }
    });

    it('returns ContractError on failure', async () => {
      mocks.readContract.mockRejectedValue(new Error('rpc error'));
      const result = await readOrgBalance(1);

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error._tag).toBe('ContractError');
        expect(result.error.operation).toBe('read_org_balance');
      }
    });
  });
});
