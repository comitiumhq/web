import type { Address, Hex } from 'viem';
import { describe, expect, it } from 'vitest';

import { deriveApplicationId } from '@/lib/eip712';

const APPLICATION_OPENING = {
  chainId: 84532,
  responseCommitmentContract: '0x1111111111111111111111111111111111111111' as Address,
  commitmentId: 42,
  jobUuid: '018f3f4d-7b8c-7d1e-8f9a-0123456789ab',
  applicationUuid: '018f3f4d-7b8c-7d1e-8f9a-0123456789ac',
  salt: `0x${'aa'.repeat(32)}` as Hex,
} as const;
const EXPECTED_APPLICATION_ID = '0xa31457c8adc8fd6378e3949ea387cb79e889d468417dfd7509296daecbffc0a2' as Hex;

describe('Application response commitment ID', () => {
  it('matches the shared golden vector and binds every opening field', () => {
    expect(deriveApplicationId(APPLICATION_OPENING)).toBe(EXPECTED_APPLICATION_ID);

    const mutations = [
      { ...APPLICATION_OPENING, chainId: 8453 },
      { ...APPLICATION_OPENING, responseCommitmentContract: '0x2222222222222222222222222222222222222222' as Address },
      { ...APPLICATION_OPENING, commitmentId: 43 },
      { ...APPLICATION_OPENING, jobUuid: '018f3f4d-7b8c-7d1e-8f9a-0123456789ae' },
      { ...APPLICATION_OPENING, applicationUuid: '018f3f4d-7b8c-7d1e-8f9a-0123456789af' },
      { ...APPLICATION_OPENING, salt: `0x${'cc'.repeat(32)}` as Hex },
    ];

    for (const mutation of mutations) {
      expect(deriveApplicationId(mutation)).not.toBe(EXPECTED_APPLICATION_ID);
    }
  });
});
