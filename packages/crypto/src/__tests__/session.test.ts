import { describe, expect, it } from 'vitest';
import { createCryptoSessionIdentity, formatCryptoSessionIdentity, isSameCryptoSession } from '../session';
import { mockWrappedUserKey } from './crypto-helpers';
import { OTHER_USER_ID, USER_ID } from './unlock-fixtures';

describe('crypto identity', () => {
  it('survives password/recovery wrapper changes but rejects pk, user or generation changes', () => {
    const bundle = mockWrappedUserKey();
    const identity = createCryptoSessionIdentity(bundle, USER_ID);
    const changedWrap = structuredClone(bundle);

    changedWrap.wraps[0].ek = changedWrap.wraps[0].ek.replace(/^A/, 'B');

    expect(isSameCryptoSession(identity, createCryptoSessionIdentity(changedWrap, USER_ID))).toBe(true);
    expect(
      isSameCryptoSession(
        identity,
        createCryptoSessionIdentity({ ...bundle, pk: { ...bundle.pk, ek: 'AQ==' } }, USER_ID),
      ),
    ).toBe(false);
    expect(isSameCryptoSession(identity, createCryptoSessionIdentity(bundle, OTHER_USER_ID))).toBe(false);
    expect(isSameCryptoSession(identity, createCryptoSessionIdentity({ ...bundle, keyVersion: 2 }, USER_ID))).toBe(
      false,
    );
    expect(formatCryptoSessionIdentity(identity)).toBe(`${USER_ID}:1`);
  });
});
