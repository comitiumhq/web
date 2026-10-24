import type { CompensationConfig, CompensationTier } from '@comitium/schemas/public-jobs';
import { describe, expect, it } from 'vitest';
import { formatCompensationCompact, formatCompensationSalary } from './salary';

function compensation(tier: Partial<CompensationTier>): CompensationConfig {
  return { tiers: [{ currency: 'USD', period: 'year', ...tier }] };
}

describe('formatCompensationSalary', () => {
  it.each([
    [{ base_min: 50000, base_max: 120000 }, '$50,000 – $120,000/yr'],
    [{ base_min: 5000, base_max: 10000, period: 'month' }, '$5,000 – $10,000/mo'],
    [{ base_min: 50, base_max: 100, period: 'hour' }, '$50 – $100/hr'],
    [{ base_min: 50000, base_max: 80000, currency: 'EUR' }, '€50,000 – €80,000/yr'],
    [{ base_min: 50000 }, 'From $50,000/yr'],
    [{ base_max: 100000 }, 'Up to $100,000/yr'],
    [{ base_min: 0, base_max: 50000 }, '$0 – $50,000/yr'],
  ] satisfies [Partial<CompensationTier>, string][])('formats %j', (tier, expected) => {
    expect(formatCompensationSalary(compensation(tier))).toBe(expected);
  });

  it.each([null, { tiers: [] }])('labels missing compensation as not disclosed: %j', (value) => {
    expect(formatCompensationSalary(value)).toBe('Not disclosed');
  });
});

describe('formatCompensationCompact', () => {
  it.each([
    [{ base_min: 50000, base_max: 120000 }, '$50k-120k/yr'],
    [{ base_min: 500, base_max: 900 }, '$500-900/yr'],
    [{ base_min: 80000 }, '$80k+/yr'],
    [{ base_max: 100000 }, 'Up to $100k/yr'],
    [{ base_min: 50000, base_max: 80000, currency: 'EUR' }, '€50k-80k/yr'],
    [{ base_min: 90000, base_max: 130000, currency: 'CHF' }, 'Fr90k-130k/yr'],
    [{ base_min: 5000, base_max: 10000, period: 'month' }, '$5k-10k/mo'],
  ] satisfies [Partial<CompensationTier>, string][])('formats %j', (tier, expected) => {
    expect(formatCompensationCompact(compensation(tier))).toBe(expected);
  });

  it.each(['MXN', 'JPY', 'CNY', 'SEK', 'NOK', 'DKK'])('identifies %s when its symbol is shared', (currency) => {
    expect(formatCompensationCompact(compensation({ currency, base_min: 50000, base_max: 80000 }))).toBe(
      `${currency} 50k-80k/yr`,
    );
  });

  it('labels undisclosed compensation on job cards', () => {
    expect(formatCompensationCompact(null)).toBe('Not disclosed');
  });
});
