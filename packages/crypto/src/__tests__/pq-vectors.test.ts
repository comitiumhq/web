import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { ml_kem768_x25519 } from '@noble/post-quantum/hybrid.js';
import { describe, expect, it } from 'vitest';

import type { CryptoContextInput } from '../context';
import { decryptEnvelope } from '../envelope';
import type { EncryptedEnvelope } from '../schemas';
import fixture from './pq-vectors.fixture.json';

/**
 * Frozen post-quantum vectors (see pq-vectors.fixture.json). These anchor the
 * implementation to fixed bytes so a silent regression is caught, not just a
 * self-consistent roundtrip. Regenerate the fixture only intentionally.
 */
describe('post-quantum frozen vectors', () => {
  it('X-Wing decapsulation matches the frozen KAT (detects @noble drift)', () => {
    const sharedSecret = ml_kem768_x25519.decapsulate(
      hexToBytes(fixture.kat.ciphertext),
      hexToBytes(fixture.kat.secretKey),
    );

    expect(bytesToHex(new Uint8Array(sharedSecret))).toBe(fixture.kat.sharedSecret);
  });

  it('decrypts the frozen cross-impl envelope (guards web/api wire format)', async () => {
    const result = await decryptEnvelope(
      fixture.interop.envelope as EncryptedEnvelope,
      fixture.interop.context as CryptoContextInput,
      { recipient: 'org_vault', privateKey: hexToBytes(fixture.interop.vaultPrivateKey) },
    );

    expect(result).toEqual(fixture.interop.plaintext);
  });
});
