import { useSession } from '@comitium/auth/use-session';
import type { CareerJob } from '@comitium/jobs/schemas';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { Spinner } from '@comitium/ui/spinner';
import { SignInIcon } from '@phosphor-icons/react';
import { Link, useRouterState } from '@tanstack/react-router';
import { AuthenticatedApplicationForm } from './authenticated-application-form';

interface ApplicationFormProps {
  applyForm: NestedForm;
  jobData: JobApplicationData;
  jobTitle: string;
  company: string;
  policy: CareerJob['recruitingPrivacy'];
  onSuccess?: () => void;
}

export function ApplicationForm(props: ApplicationFormProps) {
  const { isSignedIn, isSessionLoading, user } = useSession();
  const returnTo = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  });

  if (isSessionLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner aria-label="Loading application form" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <EmptyState
        icon={SignInIcon}
        title="Sign in to apply"
        description="Sign in before entering your application details."
        className="min-h-80"
      >
        <Button asChild className="mt-6">
          <Link to="/login" search={{ returnTo }}>
            Sign in
          </Link>
        </Button>
      </EmptyState>
    );
  }

  return <AuthenticatedApplicationForm {...props} accountId={user.id} jobData={props.jobData} />;
}
