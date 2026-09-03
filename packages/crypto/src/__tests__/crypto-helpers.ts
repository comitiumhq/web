import { ml_kem768_x25519 } from '@noble/post-quantum/hybrid.js';
import { base64 } from '@scure/base';
import type { Address, Hex } from 'viem';
import type { WrappedKey } from '../envelope-key';
import type { WrappedPersonalKey } from '../personal-key';
import type { PublicEncryptionKey } from '../schemas';
import { ALGORITHM_SUITE_VERSION } from '../version';

function makeKeyPair(privHex: string) {
  const privateKey = Uint8Array.from(Buffer.from(privHex, 'hex'));
  const publicKey = publicEncryptionKeyFromPrivateKey(privateKey);

  return { privateKey, publicKey };
}

export const TEST_KEYS = {
  alice: makeKeyPair('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  bob: makeKeyPair('abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'),
  charlie: makeKeyPair('1111111111111111111111111111111111111111111111111111111111111111'),
};

export const TEST_ADDRESS = '0x1AD16Bd08fC819abc7D0F43cFFde517591D56b59' as Address;
export const TEST_SIGNATURE = `0x${'11'.repeat(32)}${'22'.repeat(32)}1b` as Hex;

export function randomDek(): Uint8Array {
  const dek = new Uint8Array(32);
  crypto.getRandomValues(dek);

  return dek;
}

/**
 * Flip a character in a base64 string at position `pos` to guarantee the string changes.
 */
export function tamperBase64(b64: string, pos = 4): string {
  const bytes = base64.decode(b64);

  bytes[Math.min(pos, bytes.length - 1)] ^= 0xff;

  return base64.encode(bytes);
}

/**
 * Flip one hex nibble at position `pos`, preserving length and hex validity, so the
 * value still passes hex-length schema checks but no longer decodes to the same bytes.
 */
export function tamperHex(hex: string, pos = 0): string {
  const index = Math.min(pos, hex.length - 1);
  const flipped = hex[index] === 'a' ? 'b' : 'a';

  return `${hex.slice(0, index)}${flipped}${hex.slice(index + 1)}`;
}

export function sampleFormData(): Record<string, unknown> {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    experience: 5,
    skills: ['TypeScript', 'React', 'Solidity'],
    education: {
      degree: 'MSc Computer Science',
      institution: 'MIT',
      year: 2020,
    },
    available: true,
    notes: null,
  };
}

export function mockPublicEncryptionKey(seedHex = '22'.repeat(32)): PublicEncryptionKey {
  return publicEncryptionKeyFromPrivateKey(Uint8Array.from(Buffer.from(seedHex, 'hex')));
}

/** Mock WrappedKey structure for tests that don't need real crypto. */
export function mockWrappedKey(overrides?: Partial<WrappedKey>): WrappedKey {
  return {
    v: 1,
    ek: base64.encode(new Uint8Array(32)),
    epk: 'aa'.repeat(32),
    kemCt: base64.encode(new Uint8Array(1088)),
    iv: base64.encode(new Uint8Array(12)),
    ...overrides,
  };
}

/** Mock WrappedPersonalKey structure for tests that don't need real crypto. */
export function mockWrappedPersonalKey(overrides?: Partial<WrappedPersonalKey>): WrappedPersonalKey {
  return {
    v: 1,
    pk: { ek: 'enc', iv: 'nn' },
    wraps: [
      {
        method: 'wallet_signature',
        kdf: 'signature+share',
        id: 'evm:0x1ad16bd08fc819abc7d0f43cffde517591d56b59',
        ek: 'wrap',
        iv: 'ww',
        salt: 'ss',
      },
    ],
    ...overrides,
  };
}

function publicEncryptionKeyFromPrivateKey(privateKey: Uint8Array): PublicEncryptionKey {
  return {
    v: ALGORITHM_SUITE_VERSION,
    xwing: base64.encode(new Uint8Array(ml_kem768_x25519.getPublicKey(privateKey))),
  };
}
