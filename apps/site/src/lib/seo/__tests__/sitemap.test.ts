import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildRobotsTxt, buildSitemapXml, listPublicSitemapEntries } from '../sitemap';

describe('public sitemap helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists only the public prelaunch pages', async () => {
    vi.stubEnv('VITE_ENVIRONMENT', 'production');
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', 'https://comitium.co');

    const entries = await listPublicSitemapEntries();

    expect(entries.map((entry) => entry.loc)).toEqual([
      'https://comitium.co/',
      'https://comitium.co/encryption',
      'https://comitium.co/privacy',
      'https://comitium.co/terms',
      'https://comitium.co/ai-terms',
      'https://comitium.co/dpa',
    ]);
    expect(entries.every((entry) => entry.lastmod === undefined)).toBe(true);
  });

  it('serializes sitemap XML and robots policy with the canonical public origin', () => {
    vi.stubEnv('VITE_ENVIRONMENT', 'production');
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', 'https://comitium.co');

    expect(
      buildSitemapXml([
        {
          loc: 'https://comitium.co/careers/acme/jobs/backend-engineer',
          changefreq: 'daily',
          priority: 0.9,
          lastmod: '2026-06-03T12:00:00.000Z',
        },
      ]),
    ).toContain('<loc>https://comitium.co/careers/acme/jobs/backend-engineer</loc>');
    expect(buildRobotsTxt()).toContain('Sitemap: https://comitium.co/sitemap.xml');
    expect(buildRobotsTxt()).toContain('Disallow: /jobs');
    expect(buildRobotsTxt()).toContain('Disallow: /careers/');
  });

  it('uses request-origin fallback for non-production server routes', async () => {
    vi.stubEnv('VITE_ENVIRONMENT', 'development');
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', '');

    const entries = await listPublicSitemapEntries('http://localhost:3000');

    expect(entries.map((entry) => entry.loc)).toEqual([
      'http://localhost:3000/',
      'http://localhost:3000/encryption',
      'http://localhost:3000/privacy',
      'http://localhost:3000/terms',
      'http://localhost:3000/ai-terms',
      'http://localhost:3000/dpa',
    ]);
    expect(buildRobotsTxt('http://localhost:3000')).toContain('Sitemap: http://localhost:3000/sitemap.xml');
  });
});
