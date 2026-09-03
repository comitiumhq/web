import { z } from 'zod';

const INTERNAL_PATH_PATTERN = /^\/(?![\\/])/;
const URL_PARSER_BASE = 'https://return-to.invalid';

export const authSearchSchema = z.object({
  returnTo: z.string().optional(),
});

export type AuthRoutePath = '/login' | '/signup';

export function buildAuthRoute(path: AuthRoutePath, returnTo: string): string {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function isAuthRoutePath(pathname: string): boolean {
  return (
    pathname === '/login' || pathname.startsWith('/login/') || pathname === '/signup' || pathname.startsWith('/signup/')
  );
}

export function resolveInternalReturnTo(value: unknown, fallback: string): string {
  const parsedValue = z.string().safeParse(value);

  if (!parsedValue.success || !INTERNAL_PATH_PATTERN.test(parsedValue.data)) {
    return fallback;
  }

  try {
    const decodedValue = decodeURIComponent(parsedValue.data);

    if (!INTERNAL_PATH_PATTERN.test(decodedValue)) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return parsedValue.data;
}

export function resolveNonAuthReturnTo(value: unknown, fallback: string): string {
  const returnTo = resolveInternalReturnTo(value, fallback);
  const pathname = new URL(returnTo, URL_PARSER_BASE).pathname;

  return isAuthRoutePath(pathname) ? fallback : returnTo;
}
