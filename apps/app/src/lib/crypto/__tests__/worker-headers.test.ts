import { describe, expect, it } from 'vitest';
import { injectCryptoApiOrigin } from '../../../../../../tooling/vite/crypto-worker-headers';

describe('crypto Worker production CSP', () => {
  const headers =
    '/assets/worker.js\n  Content-Security-Policy: connect-src __COMITIUM_API_ORIGIN__\n/pdf.worker.js\n  Content-Security-Policy: connect-src none';

  it('allows only the configured API origin and preserves the PDF policy', () => {
    expect(injectCryptoApiOrigin(headers, 'https://api.comitium.test/v1')).toBe(
      headers.replace('__COMITIUM_API_ORIGIN__', 'https://api.comitium.test'),
    );
  });

  it.each(['javascript:alert(1)', 'https://name:secret@api.comitium.test', ''])(
    'rejects unsafe or absent API configuration',
    (apiUrl) => {
      expect(() => injectCryptoApiOrigin(headers, apiUrl)).toThrow();
    },
  );

  it('fails a build with an outdated headers template', () => {
    expect(() => injectCryptoApiOrigin('connect-src none', 'https://api.comitium.test')).toThrow();
  });
});
