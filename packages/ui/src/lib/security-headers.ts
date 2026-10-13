import { useRouter } from '@tanstack/react-router';

const CSP_NONCE_BYTES = 16;

export function createCspNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(CSP_NONCE_BYTES))));
}

export function securityHeaders(nonce: string): Record<string, string> {
  return {
    'Content-Security-Policy': [
      `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

export function useCspNonce(): string | undefined {
  return useRouter().options.ssr?.nonce;
}
