import { describe, expect, it } from 'vitest';

import { calculateFee, calculateTotalRequired, type JobEconomicsConfig, usdcToUsd } from './job-economics';

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

describe('core/constants', () => {
  describe('calculateFee', () => {
    it('tier 0: base fee + 1.5% of $300', () => {
      expect(calculateFee(300_000_000n, 0, jobConfig)).toBe(29_500_000n);
    });

    it('tier 1: base fee + 2.5% of $300', () => {
      expect(calculateFee(300_000_000n, 1, jobConfig)).toBe(42_500_000n);
    });

    it('tier 2: base fee + 3.5% of $300', () => {
      expect(calculateFee(300_000_000n, 2, jobConfig)).toBe(60_500_000n);
    });

    it('large stake: base fee + 1.5% of $10,000', () => {
      expect(calculateFee(10_000_000_000n, 0, jobConfig)).toBe(175_000_000n);
    });

    it('minimum stake $100 tier 0', () => {
      const fee = calculateFee(100_000_000n, 0, jobConfig);

      expect(fee).toBe(26_500_000n);
      expect(usdcToUsd(fee)).toBe(26.5);
    });
  });

  describe('calculateTotalRequired', () => {
    it('returns stake + fee', () => {
      const stake = 300_000_000n;
      const fee = calculateFee(stake, 0, jobConfig);
      const total = calculateTotalRequired(stake, 0, jobConfig);

      expect(total).toBe(stake + fee);
      expect(total).toBe(329_500_000n);
    });

    it('tier 2 total', () => {
      const total = calculateTotalRequired(1_000_000_000n, 2, jobConfig);

      expect(total).toBe(1_085_000_000n);
    });
  });

  describe('usdcToUsd', () => {
    it('converts whole dollars', () => {
      expect(usdcToUsd(300_000_000n)).toBe(300);
    });

    it('converts with cents', () => {
      expect(usdcToUsd(1_500_000n)).toBe(1.5);
    });

    it('converts small amounts', () => {
      expect(usdcToUsd(10_000n)).toBe(0.01);
    });

    it('converts zero', () => {
      expect(usdcToUsd(0n)).toBe(0);
    });
  });

  describe('calculateFee edge cases', () => {
    it('keeps base fee when percentage rounds to zero', () => {
      expect(calculateFee(1n, 0, jobConfig)).toBe(25_000_000n);
    });

    it('truncates fractional percentage results', () => {
      expect(calculateFee(666n, 0, jobConfig)).toBe(25_000_009n);
    });

    it('zero stake still pays the base fee', () => {
      expect(calculateFee(0n, 0, jobConfig)).toBe(25_000_000n);
      expect(calculateFee(0n, 2, jobConfig)).toBe(50_000_000n);
    });
  });
});
