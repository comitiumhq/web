import { isAuthRoutePath } from '@comitium/auth/navigation';
import { Button } from '@comitium/ui/button';
import { RootErrorFallback } from '@comitium/ui/error-fallbacks';
import { RouteNotFound } from '@comitium/ui/route-not-found';
import { Toaster } from '@comitium/ui/sonner';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Link, Outlet, Scripts, useRouterState } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { WorkspaceHeader } from '@/components/header/workspace-header';
import { Providers } from '@/lib/providers';
import { WalletProviders } from '@/lib/wallet-providers';

import appCss from '../../public/globals.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Comitium' },
      { name: 'description', content: 'The hiring platform for the new internet' },
      { name: 'application-name', content: 'Comitium' },
      { name: 'apple-mobile-web-app-title', content: 'Comitium' },
      { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#0a0a0a', media: '(prefers-color-scheme: dark)' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#0a0a0a' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <RouteNotFound
      action={
        <Button asChild>
          <Link to="/">Back home</Link>
        </Button>
      }
    />
  );
}

function RootLayout() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const shouldNoindex = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.status === 'error' || match.status === 'notFound' || match.globalNotFound),
  });
  const authPage = isAuthRoutePath(pathname);
  const routeOwnsHeader = pathname.startsWith('/org/');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {shouldNoindex ? <meta name="robots" content="noindex,follow" /> : null}
      </head>
      <body suppressHydrationWarning className="font-sans antialiased m-0 p-0 overflow-hidden">
        <ErrorBoundary FallbackComponent={RootErrorFallback}>
          <Providers queryClient={queryClient}>
            <WalletProviders>
              <AppShell showWorkspaceHeader={!routeOwnsHeader && !authPage} reserveWorkspaceHeaderSpace={!authPage} />
            </WalletProviders>
          </Providers>
        </ErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}

function AppShell({
  showWorkspaceHeader,
  reserveWorkspaceHeaderSpace,
}: {
  showWorkspaceHeader: boolean;
  reserveWorkspaceHeaderSpace: boolean;
}) {
  return (
    <div>
      <Toaster position="bottom-right" offset={16} />
      {showWorkspaceHeader ? <WorkspaceHeader /> : null}
      <main
        data-app-scroll-container
        className={`h-screen w-screen overflow-auto bg-background ${reserveWorkspaceHeaderSpace ? 'pt-14' : ''}`}
      >
        <Outlet />
      </main>
    </div>
  );
}
