import { usdcToUsd } from '@comitium/chain/job-economics';
import { formatUsdWhole } from '@/lib/utils';

type StakeAmount = string | bigint;

function parseStakeAmount(stake: StakeAmount): bigint {
  return typeof stake === 'bigint' ? stake : BigInt(stake);
}

export function formatEmployerStake(stake: StakeAmount): string {
  return formatUsdWhole(usdcToUsd(parseStakeAmount(stake)));
}

export function formatEmployerStakeLabel(stake: StakeAmount, label: 'stake' | 'staked'): string {
  return `${formatEmployerStake(stake)} ${label}`;
}
