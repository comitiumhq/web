import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { getAppUrl } from '@/config/web-origins';

const searchSchema = z.object({
  token: z.string().min(1).max(512).optional(),
});

export const Route = createFileRoute('/invite')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    const target = new URL(getAppUrl('/invite'));

    if (search.token) {
      target.searchParams.set('token', search.token);
    }

    throw redirect({
      href: target.toString(),
      statusCode: 307,
      headers: {
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  },
});
