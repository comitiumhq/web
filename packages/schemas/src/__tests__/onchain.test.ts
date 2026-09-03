import { describe, expect, it } from 'vitest';

import { parseOnchainAddress, parseOnchainSafeInteger, parseOnchainUint, tupleField } from '../onchain';

describe('onchain schemas', () => {
  it('parses uint-like values to bigint', () => {
    expect(parseOnchainUint(1n, 'amount')).toBe(1n);
    expect(parseOnchainUint(2, 'amount')).toBe(2n);
    expect(parseOnchainUint('3', 'amount')).toBe(3n);
  });

  it('rejects invalid uint-like values', () => {
    expect(() => parseOnchainUint(-1, 'amount')).toThrow('Invalid amount');
    expect(() => parseOnchainUint('1.5', 'amount')).toThrow('Invalid amount');
  });

  it('parses safe integers with overflow guard', () => {
    expect(parseOnchainSafeInteger(42n, 'version')).toBe(42);
    expect(() => parseOnchainSafeInteger(BigInt(Number.MAX_SAFE_INTEGER) + 1n, 'version')).toThrow('Invalid version');
  });

  it('reads named and positional tuple fields', () => {
    expect(tupleField({ available: 10n }, 0, 'available')).toBe(10n);
    expect(tupleField([20n], 0, 'available')).toBe(20n);
  });

  it('parses EVM addresses', () => {
    const address = '0x3333333333333333333333333333333333333333';

    expect(parseOnchainAddress(address, 'stakeToken')).toBe(address);
  });
});
