import { PageLoader } from '@comitium/ui/page-loader';
import { RouteNotFound } from '@comitium/ui/route-not-found';
import { type ReactNode, useCallback } from 'react';
import { useQueryOrgCreation } from '@/hooks/queries/use-query-org-creation';

import { CreateOrgError, CreateOrgLoading } from './creation-states';
import { EmailVerificationStep } from './email-verification-step';
import { OrganizationCreation } from './organization-creation';

export function CreateOrg() {
  const { data: creation, error: creationError, isFetching: isCreationFetching, refetch } = useQueryOrgCreation();

  const handleCreationRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (creationError) {
    return (
      <CreateOrgLayout>
        <CreateOrgError isRetrying={isCreationFetching} onRetry={handleCreationRetry} />
      </CreateOrgLayout>
    );
  }

  if (!creation) {
    return (
      <CreateOrgLayout>
        <CreateOrgLoading />
      </CreateOrgLayout>
    );
  }

  if (creation.status === 'created') {
    if (!creation.hasActiveMembership) {
      return <RouteNotFound />;
    }

    return <PageLoader />;
  }

  if (creation.status === 'ready') {
    return (
      <CreateOrgLayout>
        <OrganizationCreation />
      </CreateOrgLayout>
    );
  }

  return (
    <CreateOrgLayout>
      <EmailVerificationStep />
    </CreateOrgLayout>
  );
}

interface CreateOrgLayoutProps {
  children: ReactNode;
}

function CreateOrgLayout({ children }: CreateOrgLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <section aria-label="Organization setup">{children}</section>
    </div>
  );
}
