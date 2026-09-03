import { buildUrl, resolveHttpOrigin } from '@comitium/ui/url';

const DEVELOPMENT_ORIGINS = {
  app: 'http://localhost:3001',
  my: 'http://localhost:3002',
} as const;

export function getAppUrl(path = '/'): string {
  const origin = resolveHttpOrigin(
    import.meta.env.VITE_APP_ORIGIN,
    DEVELOPMENT_ORIGINS.app,
    'VITE_APP_ORIGIN',
    import.meta.env.PROD,
  );

  return buildUrl(origin, path);
}

export function getMyUrl(path = '/'): string {
  const origin = resolveHttpOrigin(
    import.meta.env.VITE_MY_ORIGIN,
    DEVELOPMENT_ORIGINS.my,
    'VITE_MY_ORIGIN',
    import.meta.env.PROD,
  );

  return buildUrl(origin, path);
}
