import type { JSX } from 'react';

import { absolutePublicUrl } from './public';

type BreadcrumbJsonLdItem = {
  name: string;
  path: string;
};

type OrganizationJsonLdInput = {
  name: string | null | undefined;
  path: string;
  website?: string | null;
  logo?: string | null;
};

export function getWebUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }

    return trimmed;
  } catch {
    return undefined;
  }
}

export function jsonLdMeta(value: unknown) {
  return { 'script:ld+json': value } as unknown as JSX.IntrinsicElements['meta'];
}

export function buildOrganizationJsonLd(input: OrganizationJsonLdInput) {
  const name = input.name?.trim() ?? '';

  if (!name) {
    return null;
  }

  const sameAs = getWebUrl(input.website);
  const logo = getWebUrl(input.logo);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: absolutePublicUrl(input.path),
    ...(sameAs ? { sameAs } : {}),
    ...(logo ? { logo } : {}),
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbJsonLdItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolutePublicUrl(item.path),
    })),
  };
}
