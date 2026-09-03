import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { Address } from 'viem';

import type { WrappedPersonalKey } from './personal-key';

export interface CryptoSessionIdentity {
  address: Address;
  wrappedPersonalKeyFingerprint: string;
}

export function createCryptoSessionIdentity(
  wrappedPersonalKey: WrappedPersonalKey,
  address: string,
): CryptoSessionIdentity {
  return {
    address: address.toLowerCase() as Address,
    wrappedPersonalKeyFingerprint: formatWrappedPersonalKeyFingerprint(wrappedPersonalKey),
  };
}

export function isSameCryptoSession(left: CryptoSessionIdentity | null, right: CryptoSessionIdentity): boolean {
  if (!left) {
    return false;
  }

  return left.address === right.address && left.wrappedPersonalKeyFingerprint === right.wrappedPersonalKeyFingerprint;
}

export function formatCryptoSessionIdentity(identity: CryptoSessionIdentity): string {
  return `${identity.address}:${identity.wrappedPersonalKeyFingerprint}`;
}

function formatWrappedPersonalKeyFingerprint(wrappedPersonalKey: WrappedPersonalKey): string {
  const payload = JSON.stringify({
    v: wrappedPersonalKey.v,
    pk: wrappedPersonalKey.pk,
    wraps: wrappedPersonalKey.wraps,
  });

  return bytesToHex(sha256(new TextEncoder().encode(payload)));
}
