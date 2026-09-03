import { describe, expect, it } from 'vitest';
import { createCryptoSessionIdentity, formatCryptoSessionIdentity, isSameCryptoSession } from '../session';
import { mockWrappedPersonalKey } from './crypto-helpers';

describe('crypto session identity', () => {
  it('normalizes wallet address and fingerprints wrapped personal key material', () => {
    const wrapped = mockWrappedPersonalKey();
    const identity = createCryptoSessionIdentity(wrapped, '0xABCDEF');

    expect(identity.address).toBe('0xabcdef');
    expect(identity.wrappedPersonalKeyFingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches only the same address and wrapped key fingerprint', () => {
    const wrapped = mockWrappedPersonalKey();
    const identity = createCryptoSessionIdentity(wrapped, '0xABCDEF');
    const same = createCryptoSessionIdentity(wrapped, '0xabcdef');
    const differentAddress = createCryptoSessionIdentity(wrapped, '0x123456');
    const differentKey = createCryptoSessionIdentity(
      mockWrappedPersonalKey({
        pk: { ek: 'different-ek', iv: wrapped.pk.iv },
        wraps: wrapped.wraps,
      }),
      '0xABCDEF',
    );

    expect(isSameCryptoSession(identity, same)).toBe(true);
    expect(isSameCryptoSession(identity, differentAddress)).toBe(false);
    expect(isSameCryptoSession(identity, differentKey)).toBe(false);
    expect(isSameCryptoSession(null, identity)).toBe(false);
  });

  it('formats identity for diagnostics without dropping fingerprint data', () => {
    const identity = createCryptoSessionIdentity(mockWrappedPersonalKey(), '0xABCDEF');

    expect(formatCryptoSessionIdentity(identity)).toBe(`${identity.address}:${identity.wrappedPersonalKeyFingerprint}`);
  });
});
