import { RouteError } from '@comitium/ui/error-fallbacks';
import { createQueryClient } from '@comitium/ui/query-client';
import { getRequestCspNonce } from '@comitium/ui/start-security';
import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export interface RouterContext {
  queryClient: QueryClient;
}

export function getRouter() {
  const queryClient = createQueryClient();

  return createRouter({
    routeTree,
    scrollRestoration: true,
    getScrollRestorationKey: (location) => `${location.pathname}${location.hash}`,
    scrollToTopSelectors: ['[data-app-scroll-container]'],
    defaultPreload: 'intent',
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultErrorComponent: RouteError,
    context: { queryClient },
    ssr: { nonce: getRequestCspNonce() },
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
