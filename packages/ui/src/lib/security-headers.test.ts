import { describe, expect, it } from 'vitest';

import { createCspNonce, securityHeaders } from './security-headers';

describe('createCspNonce', () => {
  it('returns a fresh 128-bit base64 nonce per call', () => {
    const first = createCspNonce();
    const second = createCspNonce();

    expect(first).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(first).not.toBe(second);
  });
});

describe('securityHeaders', () => {
  it('enforces the nonce policy without allowing JavaScript evaluation', () => {
    const headers = securityHeaders('abc123');
    const policy = headers['Content-Security-Policy'];

    expect(policy).toContain("script-src 'nonce-abc123' 'strict-dynamic'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(headers).not.toHaveProperty('Content-Security-Policy-Report-Only');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });
});
