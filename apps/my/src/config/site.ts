import { buildUrl, resolveHttpOrigin } from '@comitium/ui/url';

const DEVELOPMENT_SITE_ORIGIN = 'http://localhost:3000';

export function getPublicSiteUrl(path = '/'): string {
  const origin = resolveHttpOrigin(
    import.meta.env.VITE_PUBLIC_SITE_ORIGIN,
    DEVELOPMENT_SITE_ORIGIN,
    'VITE_PUBLIC_SITE_ORIGIN',
    import.meta.env.PROD,
  );

  return buildUrl(origin, path);
}
