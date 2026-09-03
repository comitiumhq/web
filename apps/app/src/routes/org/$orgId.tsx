import { LS_LAST_ORG_ID } from '@comitium/auth/storage';
import { Button } from '@comitium/ui/button';
import { RouteNotFound } from '@comitium/ui/route-not-found';
import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AuthenticatedAppShell } from '@/components/auth/authenticated-app-shell';

export const Route = createFileRoute('/org/$orgId')({
  ssr: false,
  component: OrgLayout,
  notFoundComponent: NotFoundInOrg,
});

function NotFoundInOrg() {
  const { orgId } = Route.useParams();

  return (
    <RouteNotFound
      action={
        <Button asChild variant="secondary">
          <Link to="/org/$orgId/pipeline" params={{ orgId }} search={{ tab: 'review' }}>
            Back to Pipeline
          </Link>
        </Button>
      }
    />
  );
}

function OrgLayout() {
  const { orgId } = Route.useParams();

  useEffect(() => {
    localStorage.setItem(LS_LAST_ORG_ID, orgId);
  }, [orgId]);

  return (
    <AuthenticatedAppShell>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
