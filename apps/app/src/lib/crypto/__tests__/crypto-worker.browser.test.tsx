import { CryptoProxy } from '@comitium/crypto';
import type { Hex } from 'viem';
import { afterEach, describe, expect, it } from 'vitest';

const ADDRESS = '0x1111111111111111111111111111111111111111';
const KEY_SHARE = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const SIGNATURE = `0x${'11'.repeat(32)}${'22'.repeat(32)}1b` as Hex;

afterEach(async () => {
  await CryptoProxy.destroy();
});

describe('crypto worker connection', () => {
  it('executes a cryptographic operation through the real Worker and Comlink remote', async () => {
    const result = await CryptoProxy.generateAndWrapPersonalKey(SIGNATURE, ADDRESS, KEY_SHARE);

    expect(result.publicKey.xwing).toBeTypeOf('string');
    expect(result.encryptedPersonalKey.wraps).toHaveLength(1);
  });
});
