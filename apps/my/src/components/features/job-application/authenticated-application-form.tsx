import { createAuthAccountApi } from '@comitium/auth/account-api';
import type { CareerJob } from '@comitium/jobs/schemas';
import { STALE_TIME_SHORT, shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { Spinner } from '@comitium/ui/spinner';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useApplyJob } from '@/hooks/mutations/use-apply-job';
import { qk } from '@/hooks/query-keys';
import { getMyApplicationStatus } from '@/lib/api/applications';
import { api } from '@/lib/api/client';
import { ApplicationFormContent } from './application-form-content';
import { ApplicationSuccess } from './application-success';
import { useApplicationForm } from './use-application-form';

const accountApi = createAuthAccountApi(api);

interface AuthenticatedApplicationFormProps {
  accountId: string;
  applyForm: NestedForm;
  company: string;
  jobData: JobApplicationData;
  jobTitle: string;
  policy: CareerJob['recruitingPrivacy'];
  onSuccess?: () => void;
}

export function AuthenticatedApplicationForm({
  accountId,
  applyForm,
  company,
  jobData,
  jobTitle,
  policy,
  onSuccess,
}: AuthenticatedApplicationFormProps) {
  const applicationStatusQuery = useQuery({
    queryKey: qk.application.status(accountId, jobData.id),
    queryFn: () => getMyApplicationStatus(jobData.id),
    retry: shouldRetryQuery,
    staleTime: STALE_TIME_SHORT,
  });

  if (applicationStatusQuery.isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner aria-label="Loading application status" />
      </div>
    );
  }

  if (applicationStatusQuery.isError) {
    return (
      <EmptyState
        icon={WarningCircleIcon}
        title="Application status could not be loaded"
        description="Try again in a moment."
        className="min-h-80"
      >
        <Button variant="outline" className="mt-6" onClick={() => void applicationStatusQuery.refetch()}>
          Try again
        </Button>
      </EmptyState>
    );
  }

  if (applicationStatusQuery.data?.hasApplied) {
    return <ApplicationSuccess jobTitle={jobTitle} company={company} />;
  }

  return (
    <NewApplicationForm
      accountId={accountId}
      applyForm={applyForm}
      company={company}
      jobData={jobData}
      jobTitle={jobTitle}
      policy={policy}
      onSuccess={onSuccess}
    />
  );
}

function NewApplicationForm({
  accountId,
  applyForm,
  company,
  jobData,
  jobTitle,
  policy,
  onSuccess,
}: AuthenticatedApplicationFormProps) {
  const [needsZkIdentity, setNeedsZkIdentity] = useState(false);

  const zkIdentityQuery = useQuery({
    queryKey: qk.account.zkIdentity(accountId),
    queryFn: accountApi.getZkIdentityStatus,
    retry: shouldRetryQuery,
    staleTime: STALE_TIME_SHORT,
  });

  const controller = useApplicationForm({
    accountId,
    applyForm,
    postingId: jobData.postingId,
    policy,
    onSuccess,
  });

  const { form, handleApplicationCompleted, prepareSubmission } = controller;
  const { submit, isPending, isConfirming } = useApplyJob({
    onCompleted: handleApplicationCompleted,
    onZkIdentityRequired: () => setNeedsZkIdentity(true),
  });
  const isCheckingZkIdentity = zkIdentityQuery.isLoading;
  const hasVerifiedZkIdentity = !needsZkIdentity && zkIdentityQuery.data?.status === 'verified';

  const handleSubmit = useCallback(
    (data: Record<string, unknown>) => {
      if (!hasVerifiedZkIdentity) {
        return;
      }

      setNeedsZkIdentity(false);

      submit({
        jobData,
        formId: applyForm.form.id,
        ...prepareSubmission(data),
      });
    },
    [applyForm.form.id, hasVerifiedZkIdentity, jobData, prepareSubmission, submit],
  );

  const isSubmitting = form.formState.isSubmitting || isPending || isConfirming;
  const identityRequirementMessage = zkIdentityQuery.isError
    ? 'ZK Identity status could not be loaded.'
    : 'Complete ZK Identity before submitting this application.';

  const identityRequirement = !hasVerifiedZkIdentity ? (
    <>
      <span>{isCheckingZkIdentity ? 'Checking ZK Identity...' : identityRequirementMessage}</span>
      {!isCheckingZkIdentity && (
        <Link to="/account/zk-identity" className="font-medium underline underline-offset-2">
          Open ZK Identity
        </Link>
      )}
    </>
  ) : undefined;

  return (
    <ApplicationFormContent
      applyForm={applyForm}
      company={company}
      controller={controller}
      isPending={isSubmitting}
      jobTitle={jobTitle}
      onSubmit={handleSubmit}
      pendingLabel="Submitting..."
      policy={policy}
      primaryDisabled={isSubmitting || !hasVerifiedZkIdentity}
      primaryLabel="Submit application"
      primaryTooltip={identityRequirement}
    />
  );
}
