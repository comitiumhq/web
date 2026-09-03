import { formatUnits } from 'viem';

import { USDC_DECIMALS } from './usdc';

const BASIS_POINTS = 10_000n;

export type FeeTier = number;

interface JobFeeTierConfig {
  index: number;
  baseFee: bigint;
  feeBps: bigint;
  deadlineDays: number;
}

export interface JobEconomicsConfig {
  version: number;
  minStake: bigint;
  tierCount: number;
  maxBatchSize: number;
  maxUnpublishedDuration: number;
  maxPublishedDuration: number;
  feeTiers: JobFeeTierConfig[];
}

type IntegerLike = string | number | bigint;

interface RawJobEconomicsConfig {
  version: number;
  minStake: IntegerLike;
  tierCount: number;
  maxBatchSize: number;
  maxUnpublishedDuration: number;
  maxPublishedDuration: number;
  feeTiers: {
    index: number;
    baseFee: IntegerLike;
    feeBps: IntegerLike;
    deadlineDays: number;
  }[];
}

function toBigInt(value: IntegerLike): bigint {
  const parsed = typeof value === 'bigint' ? value : BigInt(value);

  if (parsed < 0n) {
    throw new Error('Expected non-negative integer');
  }

  return parsed;
}

export function normalizeJobEconomicsConfig(config: RawJobEconomicsConfig): JobEconomicsConfig {
  return {
    version: config.version,
    minStake: toBigInt(config.minStake),
    tierCount: config.tierCount,
    maxBatchSize: config.maxBatchSize,
    maxUnpublishedDuration: config.maxUnpublishedDuration,
    maxPublishedDuration: config.maxPublishedDuration,
    feeTiers: config.feeTiers.map((tier) => ({
      index: tier.index,
      baseFee: toBigInt(tier.baseFee),
      feeBps: toBigInt(tier.feeBps),
      deadlineDays: tier.deadlineDays,
    })),
  };
}

function getFeeTierConfig(config: JobEconomicsConfig, feeTier: FeeTier): JobFeeTierConfig {
  const tier = config.feeTiers.find((item) => item.index === feeTier);

  if (!tier) {
    throw new Error('Invalid fee tier');
  }

  return tier;
}

export function calculateFee(stake: bigint, feeTier: FeeTier, config: JobEconomicsConfig): bigint {
  const tier = getFeeTierConfig(config, feeTier);

  return tier.baseFee + (stake * tier.feeBps) / BASIS_POINTS;
}

export function calculateTotalRequired(stake: bigint, feeTier: FeeTier, config: JobEconomicsConfig): bigint {
  return stake + calculateFee(stake, feeTier, config);
}

export function usdcToUsd(usdc: bigint): number {
  return Number(formatUnits(usdc, USDC_DECIMALS));
}
