import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveIpfsGatewayUrls, resolveIpfsUrl } from './ipfs';

describe('IPFS URL resolver', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FILEBASE_GATEWAY_BASE_URL', 'https://gateway.test.local/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves IPFS URIs and bare CIDs through Filebase first', () => {
    expect(resolveIpfsUrl('ipfs://bafybeigdyrzt')).toBe('https://gateway.test.local/ipfs/bafybeigdyrzt');
    expect(resolveIpfsUrl('bafybeigdyrzt')).toBe('https://gateway.test.local/ipfs/bafybeigdyrzt');
    expect(resolveIpfsGatewayUrls('ipfs://bafybeigdyrzt')).toEqual([
      'https://gateway.test.local/ipfs/bafybeigdyrzt',
      'https://dweb.link/ipfs/bafybeigdyrzt',
      'https://ipfs.io/ipfs/bafybeigdyrzt',
    ]);
  });

  it('returns non-IPFS URLs unchanged', () => {
    expect(resolveIpfsUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png');
  });

  it('returns null for empty input', () => {
    expect(resolveIpfsUrl(null)).toBeNull();
    expect(resolveIpfsUrl('')).toBeNull();
  });
});
