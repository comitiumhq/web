import { formatUnits } from 'viem';

import { USDC_DECIMALS } from './usdc';

const BASIS_POINTS = 10_000n;

export type FeeTier = number;

interface CommitmentFeeTierConfig {
  index: number;
  baseFee: bigint;
  feeBps: bigint;
  deadlineDays: number;
}

export interface ResponseCommitmentEconomicsConfig {
  version: number;
  minStake: bigint;
  tierCount: number;
  maxBatchSize: number;
  maxStoppedDuration: number;
  maxActiveDuration: number;
  feeTiers: CommitmentFeeTierConfig[];
}

type IntegerLike = string | number | bigint;

interface RawResponseCommitmentEconomicsConfig {
  version: number;
  minStake: IntegerLike;
  tierCount: number;
  maxBatchSize: number;
  maxStoppedDuration: number;
  maxActiveDuration: number;
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

export function normalizeResponseCommitmentEconomicsConfig(
  config: RawResponseCommitmentEconomicsConfig,
): ResponseCommitmentEconomicsConfig {
  return {
    version: config.version,
    minStake: toBigInt(config.minStake),
    tierCount: config.tierCount,
    maxBatchSize: config.maxBatchSize,
    maxStoppedDuration: config.maxStoppedDuration,
    maxActiveDuration: config.maxActiveDuration,
    feeTiers: config.feeTiers.map((tier) => ({
      index: tier.index,
      baseFee: toBigInt(tier.baseFee),
      feeBps: toBigInt(tier.feeBps),
      deadlineDays: tier.deadlineDays,
    })),
  };
}

function getFeeTierConfig(config: ResponseCommitmentEconomicsConfig, feeTier: FeeTier): CommitmentFeeTierConfig {
  const tier = config.feeTiers.find((item) => item.index === feeTier);

  if (!tier) {
    throw new Error('Invalid fee tier');
  }

  return tier;
}

export function calculateFee(stake: bigint, feeTier: FeeTier, config: ResponseCommitmentEconomicsConfig): bigint {
  const tier = getFeeTierConfig(config, feeTier);

  return tier.baseFee + (stake * tier.feeBps) / BASIS_POINTS;
}

export function calculateTotalRequired(
  stake: bigint,
  feeTier: FeeTier,
  config: ResponseCommitmentEconomicsConfig,
): bigint {
  return stake + calculateFee(stake, feeTier, config);
}

export function usdcToUsd(usdc: bigint): number {
  return Number(formatUnits(usdc, USDC_DECIMALS));
}
