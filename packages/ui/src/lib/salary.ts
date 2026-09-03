import { CURRENCIES } from '@comitium/schemas/job-enums';
import type { CompensationConfig, CompensationTier } from '@comitium/schemas/public-jobs';

const PERIOD_SUFFIX: Record<string, string> = {
  month: '/mo',
  hour: '/hr',
  year: '/yr',
};

function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.value === code)?.symbol ?? '$';
}

function getSuffix(period?: string | null): string {
  return PERIOD_SUFFIX[period || ''] || '/yr';
}

function getTier(compensation: CompensationConfig | null): CompensationTier | undefined {
  return compensation?.tiers[0];
}

function compactNumber(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency?: string | null,
  period?: string | null,
): string {
  if (min == null && max == null) {
    return 'Competitive salary';
  }

  const suffix = getSuffix(period);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  });

  if (min != null && max != null) {
    return `${formatter.format(min)} – ${formatter.format(max)}${suffix}`;
  }

  if (min != null) {
    return `From ${formatter.format(min)}${suffix}`;
  }

  if (max != null) {
    return `Up to ${formatter.format(max)}${suffix}`;
  }

  return 'Competitive salary';
}

export function formatCompactSalary(
  min: number | null,
  max: number | null,
  currency?: string | null,
  period?: string | null,
): string | null {
  if (min == null && max == null) {
    return null;
  }

  const sym = getCurrencySymbol(currency || 'USD');
  const suffix = getSuffix(period);

  if (min != null && max != null) {
    return `${sym}${compactNumber(min)}-${compactNumber(max)}${suffix}`;
  }

  if (min != null) {
    return `${sym}${compactNumber(min)}+${suffix}`;
  }

  if (max != null) {
    return `Up to ${sym}${compactNumber(max)}${suffix}`;
  }

  return null;
}

export function formatCompensationSalary(compensation: CompensationConfig | null): string {
  const tier = getTier(compensation);

  return formatSalary(tier?.base_min ?? null, tier?.base_max ?? null, tier?.currency, tier?.period);
}

export function formatCompensationCompact(compensation: CompensationConfig | null): string | null {
  const tier = getTier(compensation);

  return formatCompactSalary(tier?.base_min ?? null, tier?.base_max ?? null, tier?.currency, tier?.period);
}

export function hasCompensation(compensation: CompensationConfig | null): boolean {
  const tier = getTier(compensation);

  return tier?.base_min != null || tier?.base_max != null;
}
