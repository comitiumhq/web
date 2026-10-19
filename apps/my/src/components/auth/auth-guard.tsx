import { isAuthRoutePath } from '@comitium/auth/navigation';
import { useSession } from '@comitium/auth/use-session';
import { PageLoader } from '@comitium/ui/page-loader';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

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
  const { isSignedIn, isSessionLoading } = useSession();

  useEffect(() => {
    if (returnTo && !isSessionLoading && !isSignedIn) {
      navigate({ to: '/login', search: { returnTo }, replace: true });
    }
  }, [isSessionLoading, isSignedIn, navigate, returnTo]);

  if (isSessionLoading) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
