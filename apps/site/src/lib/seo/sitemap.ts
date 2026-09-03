import { absolutePublicUrl } from './public';

const ROBOTS_DIRECTIVES = [
  'User-agent: *',
  'Disallow: /api/',
  'Disallow: /app/',
  'Disallow: /applications',
  'Disallow: /careers/',
  'Disallow: /invite',
  'Disallow: /jobs',
  'Disallow: /org/',
  'Disallow: /organization/',
];

type SitemapChangeFrequency = 'daily' | 'weekly';

export type SitemapEntry = {
  loc: string;
  changefreq: SitemapChangeFrequency;
  priority: number;
  lastmod?: string;
};

type RelativeSitemapEntry = Omit<SitemapEntry, 'loc'> & {
  path: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sitemapElement(name: string, value: string | number): string {
  return `    <${name}>${escapeXml(String(value))}</${name}>`;
}

function buildSitemapUrlXml(entry: SitemapEntry): string {
  const lines = ['  <url>', sitemapElement('loc', entry.loc)];

  if (entry.lastmod) {
    lines.push(sitemapElement('lastmod', entry.lastmod));
  }

  lines.push(sitemapElement('changefreq', entry.changefreq));
  lines.push(sitemapElement('priority', entry.priority));
  lines.push('  </url>');

  return lines.join('\n');
}

export async function listPublicSitemapEntries(fallbackOrigin?: string): Promise<SitemapEntry[]> {
  const entries: RelativeSitemapEntry[] = [
    {
      path: '/',
      changefreq: 'weekly',
      priority: 1,
    },
    {
      path: '/encryption',
      changefreq: 'weekly',
      priority: 0.6,
    },
    {
      path: '/privacy',
      changefreq: 'weekly',
      priority: 0.5,
    },
    {
      path: '/terms',
      changefreq: 'weekly',
      priority: 0.5,
    },
    {
      path: '/ai-terms',
      changefreq: 'weekly',
      priority: 0.4,
    },
    {
      path: '/dpa',
      changefreq: 'weekly',
      priority: 0.4,
    },
  ];

  return entries.map((entry) => ({
    ...entry,
    loc: absolutePublicUrl(entry.path, fallbackOrigin),
  }));
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map(buildSitemapUrlXml).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildRobotsTxt(fallbackOrigin?: string): string {
  return [...ROBOTS_DIRECTIVES, '', `Sitemap: ${absolutePublicUrl('/sitemap.xml', fallbackOrigin)}`, ''].join('\n');
}
