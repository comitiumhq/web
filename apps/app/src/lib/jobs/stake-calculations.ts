import {
  calculateFee,
  type FeeTier,
  type ResponseCommitmentEconomicsConfig,
  usdcToUsd,
} from '@comitium/chain/response-commitment-economics';
import { USDC_UNIT, wholeUsdToUsdcUnits } from '@comitium/chain/usdc';

export interface FeeTierOption {
  tier: FeeTier;
  baseFeeUsd: number;
  feePercent: number;
  deadlineDays: number;
}

export type FeeTierValue = FeeTier;

export function getMinimumStakeUsd(config: ResponseCommitmentEconomicsConfig): number {
  return Number(ceilUsdcUnitsToWholeUsd(config.minStake));
}

export function buildFeeTierOptions(config: ResponseCommitmentEconomicsConfig): FeeTierOption[] {
  return config.feeTiers.map((tier) => ({
    tier: tier.index,
    baseFeeUsd: usdcToUsd(tier.baseFee),
    feePercent: Number(tier.feeBps) / 100,
    deadlineDays: tier.deadlineDays,
  }));
}

export function getFeeTierInfo(config: ResponseCommitmentEconomicsConfig, tier: FeeTierValue): FeeTierOption {
  const options = buildFeeTierOptions(config);
  const selected = options.find((option) => option.tier === tier);

  if (selected) {
    return selected;
  }

  const fallback = options[0];

  if (!fallback) {
    throw new Error('Response commitment config has no fee tiers');
  }

  return fallback;
}

export function calculatePlatformFee(
  employerStake: number,
  tier: FeeTierValue,
  config: ResponseCommitmentEconomicsConfig,
): number {
  return usdcToUsd(calculateFee(wholeUsdToUsdcUnits(employerStake), tier, config));
}

function ceilUsdcUnitsToWholeUsd(value: bigint): bigint {
  if (value === 0n) {
    return 0n;
  }

  return (value + USDC_UNIT - 1n) / USDC_UNIT;
}
