import { PageContainer } from '@comitium/ui/page-container';
import { PageLoader } from '@comitium/ui/page-loader';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AuthenticatedAppShell } from '@/components/auth/authenticated-app-shell';
import { CreateOrg } from '@/components/features/create-org';
import { useQueryMyOrgs } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrgCreation } from '@/hooks/queries/use-query-org-creation';
import { qk } from '@/hooks/query-keys';
import { canAccessOrganizationOnboarding, getAccessibleCreatedOrganizationId } from '@/lib/schemas/org';
import { getPreferredOrg } from '@/lib/utils/org';

export const Route = createFileRoute('/org/create')({
  ssr: false,
  component: CreateOrgPage,
});

function CreateOrgPage() {
  return (
    <AuthenticatedAppShell>
      <AuthGuard>
        <OrganizationOnboardingBoundary />
      </AuthGuard>
    </AuthenticatedAppShell>
  );
}

function OrganizationOnboardingBoundary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const orgs = useQueryMyOrgs();
  const creation = useQueryOrgCreation();

  useEffect(() => {
    if (!orgs.isSuccess || !creation.isSuccess) {
      return;
    }

    if (canAccessOrganizationOnboarding(creation.data, orgs.data.length)) {
      return;
    }

    const createdOrganizationId = getAccessibleCreatedOrganizationId(creation.data);

    if (createdOrganizationId) {
      queryClient.invalidateQueries({ queryKey: qk.orgs.my() });
      navigate({
        to: '/org/$orgId/organization/company',
        params: { orgId: createdOrganizationId },
        replace: true,
      });
      return;
    }

    const organizationId = getPreferredOrg(orgs.data)?.id;

    if (organizationId) {
      navigate({ to: '/org/$orgId', params: { orgId: organizationId }, replace: true });
      return;
    }

    navigate({ to: '/', replace: true });
  }, [creation.data, creation.isSuccess, navigate, orgs.data, orgs.isSuccess, queryClient]);

  if (!orgs.isSuccess || !creation.isSuccess) {
    return <PageLoader />;
  }

  if (!canAccessOrganizationOnboarding(creation.data, orgs.data.length)) {
    return <PageLoader />;
  }

  return (
    <PageContainer size="narrow" className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center py-12 sm:py-16">
      <CreateOrg />
    </PageContainer>
  );
}
