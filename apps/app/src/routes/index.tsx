import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useQueryMyOrgs } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrgCreation } from '@/hooks/queries/use-query-org-creation';
import { canAccessOrganizationOnboarding, getAccessibleCreatedOrganizationId } from '@/lib/schemas/org';
import { getPreferredOrg } from '@/lib/utils/org';

export const Route = createFileRoute('/')({
  ssr: false,
  component: AppEntry,
});

function AppEntry() {
  return (
    <AuthGuard>
      <AuthenticatedAppEntry />
    </AuthGuard>
  );
}

function AuthenticatedAppEntry() {
  const navigate = useNavigate();
  const orgs = useQueryMyOrgs();
  const creation = useQueryOrgCreation();

  useEffect(() => {
    if (!orgs.isSuccess || !creation.isSuccess) {
      return;
    }

    const preferredOrg = getPreferredOrg(orgs.data);

    if (preferredOrg) {
      navigate({ to: '/org/$orgId', params: { orgId: preferredOrg.id }, replace: true });
      return;
    }

    const createdOrganizationId = getAccessibleCreatedOrganizationId(creation.data);

    if (createdOrganizationId) {
      navigate({ to: '/org/$orgId', params: { orgId: createdOrganizationId }, replace: true });
      return;
    }

    if (canAccessOrganizationOnboarding(creation.data, orgs.data.length)) {
      navigate({ to: '/org/create', replace: true });
    }
  }, [creation.data, creation.isSuccess, navigate, orgs.data, orgs.isSuccess]);

  return <PageLoader />;
}
