import { createFileRoute } from '@tanstack/react-router';

import { buildSitemapXml, listPublicSitemapEntries } from '@/lib/seo/sitemap';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestOrigin = new URL(request.url).origin;
        const entries = await listPublicSitemapEntries(requestOrigin);

        return new Response(buildSitemapXml(entries), {
          headers: {
            'cache-control': 'public, max-age=300',
            'content-type': 'application/xml; charset=utf-8',
          },
        });
      },
    },
  },
});
