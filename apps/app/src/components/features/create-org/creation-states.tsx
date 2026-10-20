import { Button } from '@comitium/ui/button';
import { PageHeader } from '@comitium/ui/page-header';
import { PageLoader } from '@comitium/ui/page-loader';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';

interface CreateOrgErrorProps {
  isRetrying: boolean;
  onRetry: () => void;
}

interface OrganizationCreationErrorProps {
  onRetry: () => void;
}

export function CreateOrgError({ isRetrying, onRetry }: CreateOrgErrorProps) {
  return (
    <section className="grid gap-6" aria-label="Organization setup unavailable">
      <PageHeader
        title="Couldn’t load organization setup"
        description="Check your connection and try again."
        className="justify-center text-center [&>div]:w-full"
      />
      <Button type="button" size="lg" className="w-full" onClick={onRetry} disabled={isRetrying}>
        {isRetrying && <Spinner data-icon="inline-start" />}
        {isRetrying ? 'Retrying...' : 'Try again'}
      </Button>
    </section>
  );
}

export function CreateOrgLoading() {
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

export function OrganizationCreationPending() {
  return (
    <section aria-label="Creating organization" aria-busy="true">
      <PageLoader />
    </section>
  );
}

export function OrganizationCreationError({ onRetry }: OrganizationCreationErrorProps) {
  return (
    <section className="grid gap-6" aria-label="Organization creation failed">
      <PageHeader
        title="Couldn’t create your organization"
        description="Your work email is verified. Try again to finish setup."
        className="justify-center text-center [&>div]:w-full"
      />
      <Button size="lg" className="w-full" onClick={onRetry}>
        Try again
      </Button>
    </section>
  );
}
