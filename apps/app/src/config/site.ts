import { buildUrl, resolveHttpOrigin } from '@comitium/ui/url';

const DEVELOPMENT_SITE_ORIGIN = 'http://localhost:3000';

export function getPublicSiteOrigin(): string {
  return resolveHttpOrigin(
    import.meta.env.VITE_PUBLIC_SITE_ORIGIN,
    DEVELOPMENT_SITE_ORIGIN,
    'VITE_PUBLIC_SITE_ORIGIN',
    import.meta.env.PROD,
  );
}

export function getPublicSiteUrl(path = '/'): string {
  return buildUrl(getPublicSiteOrigin(), path);
}
