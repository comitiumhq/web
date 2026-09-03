import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildBreadcrumbJsonLd, buildOrganizationJsonLd, getWebUrl, jsonLdMeta } from '../json-ld';

describe('JSON-LD builders', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds absolute breadcrumb items', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', 'https://comitium.co');

    expect(
      buildBreadcrumbJsonLd([
        { name: 'Jobs', path: '/jobs' },
        { name: 'Acme Careers', path: '/careers/acme' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Jobs',
          item: 'https://comitium.co/jobs',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Acme Careers',
          item: 'https://comitium.co/careers/acme',
        },
      ],
    });
  });

  it('builds organization data only when a real name exists', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', 'https://comitium.co');

    expect(
      buildOrganizationJsonLd({
        name: 'Acme',
        path: '/careers/acme',
        website: 'https://acme.example',
        logo: 'ipfs://bafybeigdyrzt',
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Acme',
      url: 'https://comitium.co/careers/acme',
      sameAs: 'https://acme.example',
    });
    expect(buildOrganizationJsonLd({ name: null, path: '/careers/acme' })).toBeNull();
  });

  it('accepts only crawlable HTTP(S) URLs', () => {
    expect(getWebUrl('https://cdn.example/logo.png')).toBe('https://cdn.example/logo.png');
    expect(getWebUrl('ipfs://bafybeigdyrzt')).toBeUndefined();
    expect(getWebUrl('/relative/logo.png')).toBeUndefined();
  });

  it('wraps structured data for TanStack route meta', () => {
    const value = { '@context': 'https://schema.org', '@type': 'BreadcrumbList' };

    expect(jsonLdMeta(value)).toEqual({ 'script:ld+json': value });
  });
});
