import { Button } from '@comitium/ui/button';
import { PageHeader } from '@comitium/ui/page-header';
import { PageLoader } from '@comitium/ui/page-loader';
import { RouteNotFound } from '@comitium/ui/route-not-found';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { type ReactNode, useCallback } from 'react';
import { useQueryOrgCreation } from '@/hooks/queries/use-query-org-creation';

import { CreateOrgStep } from './create-org-step';
import { EmailVerificationStep } from './email-verification-step';

export function CreateOrg() {
  const {
    data: creation,
    error: creationError,
    isFetching: isCreationFetching,
    refetch,
  } = useQueryOrgCreation({ pollWhileCreating: true });

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

  if (creation.status === 'creating') {
    return (
      <CreateOrgLayout>
        <CreateOrgStep domain={creation.domain} email={creation.email} isCreating />
      </CreateOrgLayout>
    );
  }

  if (creation.status === 'created') {
    if (!creation.hasActiveMembership) {
      return <RouteNotFound />;
    }

    return <PageLoader />;
  }

  if (creation.status === 'ready' || creation.status === 'failed') {
    return (
      <CreateOrgLayout>
        <CreateOrgStep
          domain={creation.domain}
          email={creation.email}
          isCreating={false}
          creationFailed={creation.status === 'failed'}
        />
      </CreateOrgLayout>
    );
  }

  return (
    <CreateOrgLayout>
      <EmailVerificationStep />
    </CreateOrgLayout>
  );
}

function CreateOrgLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <section aria-label="Organization setup">{children}</section>
    </div>
  );
}

function CreateOrgError({ isRetrying, onRetry }: { isRetrying: boolean; onRetry: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive-text">
        <WarningCircleIcon className="size-5" />
      </div>
      <PageHeader
        title="Couldn’t load organization setup"
        description="Check your connection and try again."
        className="justify-center text-center [&>div]:w-full"
      />
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={onRetry} disabled={isRetrying}>
        {isRetrying && <Spinner data-icon="inline-start" />}
        {isRetrying ? 'Retrying...' : 'Try again'}
      </Button>
    </div>
  );
}

function CreateOrgLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="mx-auto h-7 w-56" />
        <Skeleton className="mx-auto h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}
