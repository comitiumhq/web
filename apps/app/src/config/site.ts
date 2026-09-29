import { buildUrl, resolveHttpOrigin } from '@comitium/ui/url';

const DEVELOPMENT_SITE_ORIGIN = 'http://localhost:3000';
const DEVELOPMENT_MY_ORIGIN = 'http://localhost:3002';

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

export function getMyOrigin(): string {
  return resolveHttpOrigin(
    import.meta.env.VITE_MY_ORIGIN,
    DEVELOPMENT_MY_ORIGIN,
    'VITE_MY_ORIGIN',
    import.meta.env.PROD,
  );
}
