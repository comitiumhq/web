import type { LinkedAccountWithMetadata } from '@privy-io/react-auth';
import { describe, expect, it } from 'vitest';

import { isCanonicalLinkedWallet } from '../wallet';

const CANONICAL_WALLET = {
  type: 'wallet',
  address: '0x1ad16bd08fc819abc7d0f43cffde517591d56b59',
  chainType: 'ethereum',
  walletClientType: 'privy',
  walletIndex: 0,
  id: 'privy-wallet-id',
} as unknown as LinkedAccountWithMetadata;

function withOverrides(overrides: Record<string, unknown>): LinkedAccountWithMetadata {
  return { ...CANONICAL_WALLET, ...overrides } as unknown as LinkedAccountWithMetadata;
}

describe('canonical linked wallet', () => {
  it('accepts the Privy embedded Ethereum wallet at index 0', () => {
    expect(isCanonicalLinkedWallet(CANONICAL_WALLET)).toBe(true);
  });

  it('rejects an externally connected wallet linked to the same account', () => {
    expect(isCanonicalLinkedWallet(withOverrides({ walletClientType: 'metamask' }))).toBe(false);
  });

  it('rejects additional embedded wallets beyond index 0', () => {
    expect(isCanonicalLinkedWallet(withOverrides({ walletIndex: 1 }))).toBe(false);
  });

  it('rejects embedded wallets on other chains', () => {
    expect(isCanonicalLinkedWallet(withOverrides({ chainType: 'solana' }))).toBe(false);
  });

  it('rejects non-wallet linked accounts', () => {
    expect(isCanonicalLinkedWallet(withOverrides({ type: 'email' }))).toBe(false);
  });

  it('rejects a wallet without a Privy wallet id', () => {
    expect(isCanonicalLinkedWallet(withOverrides({ id: undefined }))).toBe(false);
  });
});
