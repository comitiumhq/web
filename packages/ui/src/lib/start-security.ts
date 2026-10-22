import { createMiddleware, getGlobalStartContext } from '@tanstack/react-start';

import { createCspNonce, securityHeaders } from './security-headers';

export const securityHeadersMiddleware = createMiddleware({ type: 'request' }).server(async ({ next }) => {
  const nonce = createCspNonce();
  const result = await next({ context: { nonce } });

  for (const [name, value] of Object.entries(securityHeaders(nonce))) {
    result.response.headers.set(name, value);
  }

  return result;
});

export function getRequestCspNonce(): string | undefined {
  const context: unknown = getGlobalStartContext();

  if (typeof context !== 'object' || context === null || !('nonce' in context)) {
    return undefined;
  }

  return typeof context.nonce === 'string' ? context.nonce : undefined;
}
