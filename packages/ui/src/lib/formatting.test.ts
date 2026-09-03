import { describe, expect, it } from 'vitest';

import { formatUsd, formatUsdRaw, formatUsdWhole } from './formatting';

describe('USD formatting', () => {
  it('formats dollar amounts with cents', () => {
    expect(formatUsd(1234.56)).toBe('$1,234.56');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(1_000_000)).toBe('$1,000,000.00');
  });

  it('formats dollar amounts without the currency sign', () => {
    expect(formatUsdRaw(1234.56)).toBe('1,234.56');
    expect(formatUsdRaw(0)).toBe('0.00');
  });

  it('formats whole dollar amounts', () => {
    expect(formatUsdWhole(1234)).toBe('$1,234');
    expect(formatUsdWhole(999.5)).toBe('$1,000');
    expect(formatUsdWhole(0)).toBe('$0');
  });
});
