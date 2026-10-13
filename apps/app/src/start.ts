import { securityHeadersMiddleware } from '@comitium/ui/start-security';
import { createStart } from '@tanstack/react-start';

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware],
}));
