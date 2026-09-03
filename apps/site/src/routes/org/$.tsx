import { createFileRoute, redirect } from '@tanstack/react-router';
import { getAppUrl } from '@/config/web-origins';

export const Route = createFileRoute('/org/$')({
  beforeLoad: ({ params }) => {
    const suffix = params._splat ? `/${params._splat}` : '';

    throw redirect({
      href: getAppUrl(`/org${suffix}`),
      statusCode: 307,
      headers: { 'Cache-Control': 'no-store' },
    });
  },
});
