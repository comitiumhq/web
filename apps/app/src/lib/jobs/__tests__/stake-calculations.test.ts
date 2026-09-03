import type { JobEconomicsConfig } from '@comitium/chain/job-economics';
import { describe, expect, it } from 'vitest';
import { buildFeeTierOptions, calculatePlatformFee, getFeeTierInfo, getMinimumStakeUsd } from '../stake-calculations';

const jobConfig: JobEconomicsConfig = {
  version: 1,
  minStake: 100_000_000n,
  tierCount: 3,
  maxBatchSize: 100,
  maxUnpublishedDuration: 90 * 24 * 60 * 60,
  maxPublishedDuration: 365 * 24 * 60 * 60,
  feeTiers: [
    { index: 0, baseFee: 25_000_000n, feeBps: 150n, deadlineDays: 3 },
    { index: 1, baseFee: 35_000_000n, feeBps: 250n, deadlineDays: 7 },
    { index: 2, baseFee: 50_000_000n, feeBps: 350n, deadlineDays: 14 },
  ],
};

describe('stake-calculations', () => {
  describe('constants', () => {
    it('reads minimum stake from job config', () => {
      expect(getMinimumStakeUsd(jobConfig)).toBe(100);
    });

    it('builds fee tier options from job config', () => {
      const options = buildFeeTierOptions(jobConfig);

      expect(options).toHaveLength(3);
      expect(options[0].tier).toBe(0);
      expect(options[0].baseFeeUsd).toBe(25);
      expect(options[1].tier).toBe(1);
      expect(options[1].baseFeeUsd).toBe(35);
      expect(options[2].tier).toBe(2);
      expect(options[2].baseFeeUsd).toBe(50);
    });
  });

  describe('calculatePlatformFee', () => {
    it('tier 0: base fee + 1.5% of $300', () => {
      expect(calculatePlatformFee(300, 0, jobConfig)).toBe(29.5);
    });

    it('tier 1: base fee + 2.5% of $300', () => {
      expect(calculatePlatformFee(300, 1, jobConfig)).toBe(42.5);
    });

    it('tier 2: base fee + 3.5% of $1000', () => {
      expect(calculatePlatformFee(1000, 2, jobConfig)).toBe(85);
    });

    it('preserves USDC cent precision for fractional results', () => {
      expect(calculatePlatformFee(301, 0, jobConfig)).toBe(29.515);
    });
  });

  describe('getFeeTierInfo', () => {
    it('tier 0: feePercent=1.5, deadlineDays=3', () => {
      const info = getFeeTierInfo(jobConfig, 0);

      expect(info.feePercent).toBe(1.5);
      expect(info.deadlineDays).toBe(3);
    });

    it('tier 1: feePercent=2.5, deadlineDays=7', () => {
      const info = getFeeTierInfo(jobConfig, 1);

      expect(info.feePercent).toBe(2.5);
      expect(info.deadlineDays).toBe(7);
    });

    it('tier 2: feePercent=3.5, deadlineDays=14', () => {
      const info = getFeeTierInfo(jobConfig, 2);

      expect(info.feePercent).toBe(3.5);
      expect(info.deadlineDays).toBe(14);
    });

    it('invalid tier falls back to tier 0', () => {
      const info = getFeeTierInfo(jobConfig, 99);

      expect(info.feePercent).toBe(1.5);
      expect(info.deadlineDays).toBe(3);
    });
  });
});
