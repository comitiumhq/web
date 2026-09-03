import { isClient } from '@comitium/ui/browser';
import { isProdEnv } from '@/lib/utils/environment';

const DEFAULT_SOCIAL_IMAGE_PATH = '/comitium-og-1200x630.png';
const MAX_DESCRIPTION_LENGTH = 160;

type SeoHeadInput = {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  imagePath?: string | null;
  noindex?: boolean;
};

function normalizePublicSiteOrigin(value: string, source: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${source} must not be empty`);
  }

  const url = new URL(trimmed);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${source} must use an HTTP(S) origin`);
  }

  return url.origin;
}

function getConfiguredPublicSiteOrigin(): string | null {
  const value = import.meta.env.VITE_PUBLIC_SITE_ORIGIN;

  if (!value) {
    return null;
  }

  return normalizePublicSiteOrigin(value, 'VITE_PUBLIC_SITE_ORIGIN');
}

function getPublicSiteOrigin(fallbackOrigin?: string): string {
  const configuredOrigin = getConfiguredPublicSiteOrigin();

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (fallbackOrigin && !isProdEnv()) {
    return normalizePublicSiteOrigin(fallbackOrigin, 'fallback public site origin');
  }

  if (isClient) {
    return window.location.origin;
  }

  throw new Error('VITE_PUBLIC_SITE_ORIGIN is required for server-rendered SEO URLs');
}

export function absolutePublicUrl(path: string, fallbackOrigin?: string): string {
  const origin = getPublicSiteOrigin(fallbackOrigin);
  const url = new URL(path, `${origin}/`);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Public SEO URLs must use HTTP(S) paths');
  }

  return new URL(`${url.pathname}${url.search}${url.hash}`, `${origin}/`).toString();
}

export function boundedSeoDescription(value: string | null | undefined, fallback: string): string {
  const text = (value ?? fallback).replace(/\s+/g, ' ').trim() || fallback;

  if (text.length <= MAX_DESCRIPTION_LENGTH) {
    return text;
  }

  return `${text.slice(0, MAX_DESCRIPTION_LENGTH - 3).trimEnd()}...`;
}

export function buildSeoHead(input: SeoHeadInput) {
  const canonicalUrl = absolutePublicUrl(input.path);
  const imageUrl = absolutePublicUrl(input.imagePath ?? DEFAULT_SOCIAL_IMAGE_PATH);
  const type = input.type ?? 'website';
  const meta = [
    { title: input.title },
    { name: 'description', content: input.description },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:type', content: type },
    { property: 'og:image', content: imageUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: input.title },
    { name: 'twitter:description', content: input.description },
    { name: 'twitter:image', content: imageUrl },
  ];

  if (input.noindex) {
    meta.push({ name: 'robots', content: 'noindex,follow' });
  }

  return {
    meta,
    links: [{ rel: 'canonical', href: canonicalUrl }],
  };
}
