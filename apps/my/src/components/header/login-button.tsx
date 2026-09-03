import { Button } from '@comitium/ui/button';
import { Link, useRouterState } from '@tanstack/react-router';

export function LoginButton() {
  const returnTo = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  });

  return (
    <Button asChild variant="outline">
      <Link to="/login" search={{ returnTo }}>
        Log in
      </Link>
    </Button>
  );
}
