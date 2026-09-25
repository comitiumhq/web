const PRELAUNCH_PUBLIC_ROUTES = new Set([
  '/',
  '/ai-terms',
  '/dpa',
  '/encryption',
  '/privacy',
  '/robots.txt',
  '/sitemap.xml',
  '/terms',
]);

function normalizePathname(pathname: string): string {
  if (pathname === '/') {
    return pathname;
  }

  return pathname.replace(/\/+$/, '');
}

export function isPublicSiteRouteAvailable(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  const isLocalJobsRoute = normalizedPathname === '/jobs' || normalizedPathname.startsWith('/careers/');

  return PRELAUNCH_PUBLIC_ROUTES.has(normalizedPathname) || (import.meta.env.DEV && isLocalJobsRoute);
}
