import type { Address, Hex } from 'viem';
import { describe, expect, it } from 'vitest';

import { deriveApplicationId } from '@/lib/eip712';

const APPLICATION_OPENING = {
  chainId: 84532,
  commitmentContract: '0x1111111111111111111111111111111111111111' as Address,
  jobId: 42,
  jobUuid: '018f3f4d-7b8c-7d1e-8f9a-0123456789ab',
  applicationUuid: '018f3f4d-7b8c-7d1e-8f9a-0123456789ac',
  salt: `0x${'aa'.repeat(32)}` as Hex,
} as const;
const EXPECTED_APPLICATION_ID = '0x65ff2bb733b7b0960aee75fb5f5428849b7e0db3bb5f67c41257b36f51fb8323' as Hex;

describe('Application commitment ID', () => {
  it('matches the shared golden vector and binds every opening field', () => {
    expect(deriveApplicationId(APPLICATION_OPENING)).toBe(EXPECTED_APPLICATION_ID);

    const mutations = [
      { ...APPLICATION_OPENING, chainId: 8453 },
      { ...APPLICATION_OPENING, commitmentContract: '0x2222222222222222222222222222222222222222' as Address },
      { ...APPLICATION_OPENING, jobId: 43 },
      { ...APPLICATION_OPENING, jobUuid: '018f3f4d-7b8c-7d1e-8f9a-0123456789ae' },
      { ...APPLICATION_OPENING, applicationUuid: '018f3f4d-7b8c-7d1e-8f9a-0123456789af' },
      { ...APPLICATION_OPENING, salt: `0x${'cc'.repeat(32)}` as Hex },
    ];

    for (const mutation of mutations) {
      expect(deriveApplicationId(mutation)).not.toBe(EXPECTED_APPLICATION_ID);
    }
  });
});
