import { AuthLoginSurface } from '@comitium/auth/login-surface';
import { useSession } from '@comitium/auth/use-session';
import type { AuthMode } from '@comitium/ui/auth-login-page';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { getPublicSiteUrl } from '@/config/site';

interface EmployerLoginPageProps {
  mode: AuthMode;
  returnTo?: string;
}

export function EmployerLoginPage({ mode, returnTo }: EmployerLoginPageProps) {
  const navigate = useNavigate();
  const session = useSession();
  const replace = useCallback((destination: string) => navigate({ to: destination, replace: true }), [navigate]);

  return (
    <AuthLoginSurface
      defaultReturnTo="/"
      homeHref={getPublicSiteUrl('/')}
      homeLabel="Back to Comitium"
      mode={mode}
      navigate={replace}
      privacyHref={getPublicSiteUrl('/privacy')}
      returnTo={returnTo}
      session={session}
      termsHref={getPublicSiteUrl('/terms')}
    />
  );
}
