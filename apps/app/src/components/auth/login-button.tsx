import { Button } from '@comitium/ui/button';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface LoginButtonProps {
  className?: string;
  children?: ReactNode;
}

export function LoginButton({ className, children = 'Log in' }: LoginButtonProps) {
  const navigate = useNavigate();
  const returnTo = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  });

  return (
    <Button
      onClick={() => navigate({ to: '/login', search: { returnTo } })}
      variant="outline"
      size="lg"
      className={className}
    >
      {children}
    </Button>
  );
}
