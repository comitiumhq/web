import { CURRENCIES } from '@comitium/schemas/job-enums';
import type { CompensationConfig, CompensationTier } from '@comitium/schemas/public-jobs';

const PERIOD_SUFFIX: Record<string, string> = {
  month: '/mo',
  hour: '/hr',
  year: '/yr',
};

function getCurrencyPrefix(code: string): string {
  const currency = CURRENCIES.find((item) => item.value === code);

  if (currency && code !== 'USD' && CURRENCIES.some((item) => item.value !== code && item.symbol === currency.symbol)) {
    return `${code} `;
  }

  return currency?.symbol ?? '$';
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

function formatSalary(
  min: number | null,
  max: number | null,
  currency?: string | null,
  period?: string | null,
): string {
  if (min == null && max == null) {
    return 'Not disclosed';
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

  return 'Not disclosed';
}

function formatCompactSalary(
  min: number | null,
  max: number | null,
  currency?: string | null,
  period?: string | null,
): string | null {
  if (min == null && max == null) {
    return null;
  }

  const prefix = getCurrencyPrefix(currency || 'USD');
  const suffix = getSuffix(period);

  if (min != null && max != null) {
    return `${prefix}${compactNumber(min)}-${compactNumber(max)}${suffix}`;
  }

  if (min != null) {
    return `${prefix}${compactNumber(min)}+${suffix}`;
  }

  if (max != null) {
    return `Up to ${prefix}${compactNumber(max)}${suffix}`;
  }

  return null;
}

export function formatCompensationSalary(compensation: CompensationConfig | null): string {
  const tier = getTier(compensation);

  return formatSalary(tier?.base_min ?? null, tier?.base_max ?? null, tier?.currency, tier?.period);
}

export function formatCompensationCompact(compensation: CompensationConfig | null): string {
  const tier = getTier(compensation);

  return (
    formatCompactSalary(tier?.base_min ?? null, tier?.base_max ?? null, tier?.currency, tier?.period) ?? 'Not disclosed'
  );
}
