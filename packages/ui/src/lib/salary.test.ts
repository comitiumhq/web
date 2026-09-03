import type { CompensationConfig } from '@comitium/schemas/public-jobs';
import { describe, expect, it } from 'vitest';

import {
  formatCompactSalary,
  formatCompensationCompact,
  formatCompensationSalary,
  formatSalary,
  hasCompensation,
} from './salary';

describe('salary', () => {
  describe('formatSalary', () => {
    it('formats full range yearly', () => {
      expect(formatSalary(50000, 120000)).toBe('$50,000 – $120,000/yr');
    });

    it('formats monthly', () => {
      expect(formatSalary(5000, 10000, 'USD', 'month')).toBe('$5,000 – $10,000/mo');
    });

    it('formats hourly', () => {
      expect(formatSalary(50, 100, 'USD', 'hour')).toBe('$50 – $100/hr');
    });

    it('formats EUR', () => {
      expect(formatSalary(50000, 80000, 'EUR')).toBe('€50,000 – €80,000/yr');
    });

    it('formats GBP', () => {
      expect(formatSalary(40000, 70000, 'GBP')).toBe('£40,000 – £70,000/yr');
    });

    it('formats CHF', () => {
      const result = formatSalary(90000, 130000, 'CHF');

      expect(result).toContain('90,000');
      expect(result).toContain('130,000');
      expect(result).toContain('/yr');
    });

    it('formats JPY', () => {
      const result = formatSalary(5000000, 8000000, 'JPY');

      expect(result).toContain('5,000,000');
      expect(result).toContain('8,000,000');
      expect(result).toContain('/yr');
    });

    it('formats max-only as "Up to"', () => {
      expect(formatSalary(null, 100000)).toBe('Up to $100,000/yr');
    });

    it('formats min-only as "From"', () => {
      expect(formatSalary(50000, null)).toBe('From $50,000/yr');
    });

    it('returns fallback when both null', () => {
      expect(formatSalary(null, null)).toBe('Competitive salary');
    });

    it('handles zero as valid value (not falsy)', () => {
      expect(formatSalary(0, 50000)).toBe('$0 – $50,000/yr');
    });

    it('defaults to USD and yearly', () => {
      expect(formatSalary(80000, 120000)).toBe('$80,000 – $120,000/yr');
    });
  });

  describe('formatCompactSalary', () => {
    it('formats with k suffix', () => {
      expect(formatCompactSalary(50000, 120000)).toBe('$50k-120k/yr');
    });

    it('formats small values without k', () => {
      expect(formatCompactSalary(500, 900)).toBe('$500-900/yr');
    });

    it('returns null when both null', () => {
      expect(formatCompactSalary(null, null)).toBeNull();
    });

    it('formats max-only as "Up to"', () => {
      expect(formatCompactSalary(null, 100000)).toBe('Up to $100k/yr');
    });

    it('formats min-only with + suffix', () => {
      expect(formatCompactSalary(80000, null)).toBe('$80k+/yr');
    });

    it('formats EUR with symbol from CURRENCIES', () => {
      expect(formatCompactSalary(50000, 80000, 'EUR')).toBe('€50k-80k/yr');
    });

    it('formats GBP with symbol from CURRENCIES', () => {
      expect(formatCompactSalary(40000, 70000, 'GBP')).toBe('£40k-70k/yr');
    });

    it('formats CHF with symbol from CURRENCIES', () => {
      expect(formatCompactSalary(90000, 130000, 'CHF')).toBe('Fr90k-130k/yr');
    });

    it('formats monthly', () => {
      expect(formatCompactSalary(5000, 10000, 'USD', 'month')).toBe('$5k-10k/mo');
    });

    it('falls back to $ for unknown currency', () => {
      expect(formatCompactSalary(50000, 80000, 'XYZ')).toBe('$50k-80k/yr');
    });
  });

  describe('formatCompensationSalary', () => {
    it('formats from compensation config', () => {
      const comp: CompensationConfig = {
        tiers: [{ currency: 'EUR', period: 'year', base_min: 60000, base_max: 90000 }],
      };

      expect(formatCompensationSalary(comp)).toBe('€60,000 – €90,000/yr');
    });

    it('returns fallback for null compensation', () => {
      expect(formatCompensationSalary(null)).toBe('Competitive salary');
    });

    it('returns fallback for empty tiers', () => {
      expect(formatCompensationSalary({ tiers: [] })).toBe('Competitive salary');
    });

    it('handles tier with only base_min', () => {
      const comp: CompensationConfig = {
        tiers: [{ currency: 'USD', period: 'year', base_min: 80000 }],
      };

      expect(formatCompensationSalary(comp)).toBe('From $80,000/yr');
    });
  });

  describe('formatCompensationCompact', () => {
    it('formats from compensation config', () => {
      const comp: CompensationConfig = {
        tiers: [{ currency: 'USD', period: 'month', base_min: 5000, base_max: 8000 }],
      };

      expect(formatCompensationCompact(comp)).toBe('$5k-8k/mo');
    });

    it('returns null for null compensation', () => {
      expect(formatCompensationCompact(null)).toBeNull();
    });
  });

  describe('hasCompensation', () => {
    it('returns true when base_min is set', () => {
      expect(hasCompensation({ tiers: [{ currency: 'USD', period: 'year', base_min: 50000 }] })).toBe(true);
    });

    it('returns true when base_max is set', () => {
      expect(hasCompensation({ tiers: [{ currency: 'USD', period: 'year', base_max: 80000 }] })).toBe(true);
    });

    it('returns true when base_min is 0 (not falsy)', () => {
      expect(hasCompensation({ tiers: [{ currency: 'USD', period: 'year', base_min: 0, base_max: 50000 }] })).toBe(
        true,
      );
    });

    it('returns false for null compensation', () => {
      expect(hasCompensation(null)).toBe(false);
    });

    it('returns false for empty tiers', () => {
      expect(hasCompensation({ tiers: [] })).toBe(false);
    });

    it('returns false when both base_min and base_max are undefined', () => {
      expect(hasCompensation({ tiers: [{ currency: 'USD', period: 'year' }] })).toBe(false);
    });
  });
});
