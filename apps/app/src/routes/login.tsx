import { AuthLoginSurface } from '@comitium/auth/login-surface';
import { authSearchSchema } from '@comitium/auth/navigation';
import { useSession } from '@comitium/auth/use-session';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { getPublicSiteUrl } from '@/config/site';

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: 'Log In to Comitium' },
      { name: 'description', content: 'Log In to Comitium' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const session = useSession();
  const replace = useCallback((destination: string) => navigate({ to: destination, replace: true }), [navigate]);

  return (
    <AuthLoginSurface
      defaultReturnTo="/"
      homeHref={getPublicSiteUrl('/')}
      homeLabel="Back to Comitium"
      navigate={replace}
      privacyHref={getPublicSiteUrl('/privacy')}
      returnTo={returnTo}
      session={session}
      termsHref={getPublicSiteUrl('/terms')}
    />
  );
}
