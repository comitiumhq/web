import { describe, expect, it } from 'vitest';

import { isIpfsUriOrCid, normalizeIpfsUri, requireIpfsUri } from '../ipfs';

describe('IPFS URI helpers', () => {
  it('accepts IPFS URIs and bare CIDs', () => {
    expect(isIpfsUriOrCid('ipfs://bafybeigdyrzt')).toBe(true);
    expect(isIpfsUriOrCid('QmTestCid')).toBe(true);
    expect(isIpfsUriOrCid('bafybeigdyrzt')).toBe(true);
  });

  it('normalizes bare CIDs to IPFS URIs', () => {
    expect(normalizeIpfsUri('  bafybeigdyrzt  ')).toBe('ipfs://bafybeigdyrzt');
    expect(normalizeIpfsUri('ipfs://bafybeigdyrzt')).toBe('ipfs://bafybeigdyrzt');
  });

  it('rejects non-IPFS URLs', () => {
    expect(isIpfsUriOrCid('https://example.com/logo.png')).toBe(false);
    expect(normalizeIpfsUri('javascript:alert(1)')).toBeNull();
  });

  it('applies optional max length validation', () => {
    expect(normalizeIpfsUri('ipfs://bafybeigdyrzt', { maxLength: 20 })).toBe('ipfs://bafybeigdyrzt');
    expect(normalizeIpfsUri('ipfs://bafybeigdyrzt', { maxLength: 10 })).toBeNull();
  });

  it('throws for required invalid IPFS URIs', () => {
    expect(() => requireIpfsUri('https://example.com/logo.png')).toThrow('Invalid IPFS URI');
  });
});
