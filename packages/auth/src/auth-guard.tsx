import { PageLoader } from '@comitium/ui/page-loader';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { type ReactNode, useEffect } from 'react';

import { isAuthRoutePath } from './navigation';
import { useSession } from './use-session';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const returnTo = useRouterState({
    select: (state) => (isAuthRoutePath(state.location.pathname) ? null : state.location.href),
  });

  const { isSignedIn, isSessionLoading } = useSession();

  useEffect(() => {
    if (returnTo && !isSessionLoading && !isSignedIn) {
      navigate({ to: '/login', search: { returnTo }, replace: true });
    }
  }, [isSessionLoading, isSignedIn, navigate, returnTo]);

  if (isSessionLoading || !isSignedIn) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
