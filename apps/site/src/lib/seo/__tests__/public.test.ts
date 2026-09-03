import { afterEach, describe, expect, it, vi } from 'vitest';

import { absolutePublicUrl, boundedSeoDescription, buildSeoHead } from '../public';

describe('public SEO helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds production canonical and social metadata from the configured public origin', () => {
    vi.stubEnv('VITE_ENVIRONMENT', 'production');
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', 'https://comitium.co');

    const head = buildSeoHead({
      title: 'Jobs | Comitium',
      description: 'Browse open roles.',
      path: '/jobs',
      noindex: true,
    });

    expect(head.links).toEqual([{ rel: 'canonical', href: 'https://comitium.co/jobs' }]);
    expect(absolutePublicUrl('https://preview.example/careers/acme/jobs/senior-engineer')).toBe(
      'https://comitium.co/careers/acme/jobs/senior-engineer',
    );
    expect(head.meta).toEqual(
      expect.arrayContaining([
        { title: 'Jobs | Comitium' },
        { name: 'description', content: 'Browse open roles.' },
        { property: 'og:url', content: 'https://comitium.co/jobs' },
        { property: 'og:image', content: 'https://comitium.co/comitium-og-1200x630.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'robots', content: 'noindex,follow' },
      ]),
    );
  });

  it('normalizes whitespace and bounds long descriptions', () => {
    const value = `Role
${'scope '.repeat(60)}`;
    const description = boundedSeoDescription(value, 'Fallback');

    expect(description).toHaveLength(160);
    expect(description).toMatch(/Role/);
    expect(description.endsWith('...')).toBe(true);
  });

  it('uses a provided SSR fallback outside production targets', () => {
    vi.stubEnv('VITE_ENVIRONMENT', 'dev');
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', '');

    expect(absolutePublicUrl('/careers/acme', 'http://localhost:3000')).toBe('http://localhost:3000/careers/acme');
  });

  it('requires a configured origin for server-rendered SEO URLs', () => {
    vi.stubEnv('VITE_ENVIRONMENT', 'prod');
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', '');

    expect(() => absolutePublicUrl('/jobs')).toThrow('VITE_PUBLIC_SITE_ORIGIN is required');
  });

  it('normalizes configured origins to HTTP(S) origins', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', 'https://comitium.co/careers?preview=1');

    expect(absolutePublicUrl('/jobs')).toBe('https://comitium.co/jobs');
  });
});
