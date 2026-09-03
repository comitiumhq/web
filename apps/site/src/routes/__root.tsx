import { Button } from '@comitium/ui/button';
import { cn } from '@comitium/ui/cn';
import { RootErrorFallback } from '@comitium/ui/error-fallbacks';
import { RouteNotFound } from '@comitium/ui/route-not-found';
import { Toaster } from '@comitium/ui/sonner';
import { WebAppProviders } from '@comitium/ui/web-app-providers';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  notFound,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { PublicFooter } from '@/components/footer/public-footer';
import { PublicHeader } from '@/components/header/public-header';
import { isPublicSiteRouteAvailable } from '@/config/public-route-access';

import appCss from '../../public/globals.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    if (!isPublicSiteRouteAvailable(location.pathname)) {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Comitium' },
      { name: 'description', content: 'Hiring built for privacy and accountability.' },
      { name: 'application-name', content: 'Comitium' },
      { name: 'apple-mobile-web-app-title', content: 'Comitium' },
      { name: 'theme-color', content: '#ffffff' },
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
  shellComponent: RootDocument,
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

function RootDocument({ children }: { children: ReactNode }) {
  const { queryClient } = Route.useRouteContext();
  const shouldNoindex = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.status === 'error' || match.status === 'notFound' || match.globalNotFound),
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {shouldNoindex ? <meta name="robots" content="noindex,follow" /> : null}
      </head>
      <body suppressHydrationWarning className="font-sans antialiased m-0 p-0 overflow-hidden">
        <ErrorBoundary FallbackComponent={RootErrorFallback}>
          <WebAppProviders queryClient={queryClient} forcedTheme="light">
            <AppShell>{children}</AppShell>
          </WebAppProviders>
        </ErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  return <Outlet />;
}

function AppShell({ children }: { children: ReactNode }) {
  const isLandingPage = useRouterState({ select: (state) => state.location.pathname === '/' });

  return (
    <div className="public-site-shell">
      <Toaster position="bottom-right" offset={16} />
      <PublicHeader />
      <main
        data-app-scroll-container
        className={cn('h-screen w-screen overflow-auto bg-background', !isLandingPage && 'pt-14')}
      >
        {children}
        <PublicFooter />
      </main>
    </div>
  );
}
