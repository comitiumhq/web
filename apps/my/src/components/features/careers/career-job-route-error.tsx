import { hasApiErrorStatus } from '@comitium/schemas/api-errors';
import { Button } from '@comitium/ui/button';
import { RouteError } from '@comitium/ui/error-fallbacks';
import { RouteNotFound } from '@comitium/ui/route-not-found';
import { Link } from '@tanstack/react-router';

interface CareerJobRouteErrorProps {
  error: unknown;
  reset: () => void;
}

export function CareerJobRouteError({ error, reset }: CareerJobRouteErrorProps) {
  const isMissingJob = hasApiErrorStatus(error, 404) || (error instanceof Error && error.message === 'Job not found');

  if (isMissingJob) {
    return (
      <RouteNotFound
        title="Job not found"
        description="This job is no longer available."
        action={
          <Button asChild>
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        }
      />
    );
  }

  return <RouteError error={error} reset={reset} />;
}
