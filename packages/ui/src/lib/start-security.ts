import { createMiddleware, getGlobalStartContext } from '@tanstack/react-start';
import { setResponseHeaders } from '@tanstack/react-start/server';

import { createCspNonce, securityHeaders } from './security-headers';

export const securityHeadersMiddleware = createMiddleware({ type: 'request' }).server(({ next }) => {
  const nonce = createCspNonce();

  setResponseHeaders(securityHeaders(nonce));

  return next({ context: { nonce } });
});

export function getRequestCspNonce(): string | undefined {
  const context: unknown = getGlobalStartContext();

  if (typeof context !== 'object' || context === null || !('nonce' in context)) {
    return undefined;
  }

  return typeof context.nonce === 'string' ? context.nonce : undefined;
}
