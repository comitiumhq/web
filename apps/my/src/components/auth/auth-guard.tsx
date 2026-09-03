import { buildAuthRoute, isAuthRoutePath } from '@comitium/auth/navigation';
import { useSession } from '@comitium/auth/use-session';
import { PageLoader } from '@comitium/ui/page-loader';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { AuthSessionRecovery } from './auth-session-recovery';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const returnTo = useRouterState({
    select: (state) =>
      isAuthRoutePath(state.location.pathname)
        ? null
        : `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  });
  const { isSignedIn, isSessionLoading, needsSessionRecovery } = useSession();

  useEffect(() => {
    if (returnTo && !isSessionLoading && !needsSessionRecovery && !isSignedIn) {
      navigate({ to: '/login', search: { returnTo }, replace: true });
    }
  }, [isSessionLoading, isSignedIn, navigate, needsSessionRecovery, returnTo]);

  if (isSessionLoading) {
    return <PageLoader />;
  }

  if (needsSessionRecovery) {
    const recoveryReturnTo = returnTo ? buildAuthRoute('/login', returnTo) : '/login';
    return <AuthSessionRecovery returnTo={recoveryReturnTo} />;
  }

  if (!isSignedIn) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
