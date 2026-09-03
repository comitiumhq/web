import { createFileRoute } from '@tanstack/react-router';

import { buildRobotsTxt } from '@/lib/seo/sitemap';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(buildRobotsTxt(new URL(request.url).origin), {
          headers: {
            'cache-control': 'public, max-age=300',
            'content-type': 'text/plain; charset=utf-8',
          },
        }),
    },
  },
});
