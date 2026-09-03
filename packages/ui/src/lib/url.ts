import { z } from 'zod';

const URL_PROTOCOL_PREFIX_PATTERN = /^https?:\/\/(www\.)?/i;
const TRAILING_SLASH_PATTERN = /\/$/;

const HTTP_URL_SCHEMA = z.url({ protocol: z.regexes.httpProtocol });
const HTTP_ORIGIN_SCHEMA = HTTP_URL_SCHEMA.transform((value) => new URL(value).origin);

export function resolveHttpOrigin(
  configuredOrigin: string | undefined,
  fallbackOrigin: string,
  variableName: string,
  production: boolean,
): string {
  const value = configuredOrigin?.trim();

  if (!value) {
    if (production) {
      throw new Error(`${variableName} is required in production`);
    }

    return fallbackOrigin;
  }

  const origin = HTTP_ORIGIN_SCHEMA.safeParse(value);

  if (!origin.success) {
    throw new Error(`${variableName} must be a valid HTTP(S) URL`);
  }

  return origin.data;
}

export function buildUrl(origin: string, path = '/'): string {
  return new URL(path.startsWith('/') ? path : `/${path}`, origin).toString();
}

export function isUrl(value?: string | null): value is string {
  return HTTP_URL_SCHEMA.safeParse(value).success;
}

export function formatUrlForDisplay(value: string): string {
  return value.replace(URL_PROTOCOL_PREFIX_PATTERN, '').replace(TRAILING_SLASH_PATTERN, '');
}
