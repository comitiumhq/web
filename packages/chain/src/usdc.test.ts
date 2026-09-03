import { describe, expect, it } from 'vitest';

import {
  formatUsdcAmount,
  parsePositiveUsdcInputToUnits,
  parseWholeUsdInputToNumber,
  wholeUsdToUsdcUnits,
} from './usdc';

describe('USDC money helpers', () => {
  it('parses USDC decimal strings into raw units', () => {
    expect(parsePositiveUsdcInputToUnits('326')).toBe(326_000_000n);
    expect(parsePositiveUsdcInputToUnits('3.26')).toBe(3_260_000n);
    expect(parsePositiveUsdcInputToUnits('0.000001')).toBe(1n);
  });

  it('formats exact USDC amounts without hiding token decimals', () => {
    expect(formatUsdcAmount(326_000_000n)).toBe('326 USDC');
    expect(formatUsdcAmount(56_560_000n)).toBe('56.56 USDC');
    expect(formatUsdcAmount(1n)).toBe('0.000001 USDC');
  });

  it('rejects invalid USDC precision', () => {
    expect(parsePositiveUsdcInputToUnits('0.0000001')).toBeNull();
  });

  it('converts whole-dollar values into raw units', () => {
    expect(wholeUsdToUsdcUnits('326')).toBe(326_000_000n);
    expect(wholeUsdToUsdcUnits(326)).toBe(326_000_000n);
  });

  it('parses whole-dollar input without accepting fractional values', () => {
    expect(parseWholeUsdInputToNumber('326')).toBe(326);
    expect(parseWholeUsdInputToNumber('326.5')).toBeNull();
  });
});
