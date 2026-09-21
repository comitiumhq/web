import { createAuthAccountApi } from '@comitium/auth/account-api';
import type { CareerJob } from '@comitium/jobs/schemas';
import { STALE_TIME_SHORT, shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useApplyStandardJob } from '@/hooks/mutations/use-apply-standard-job';
import { qk } from '@/hooks/query-keys';
import { api } from '@/lib/api/client';
import { ApplicationFormContent } from './application-form-content';
import { useApplicationForm } from './use-application-form';

const accountApi = createAuthAccountApi(api);

interface StandardApplicationFormProps {
  accountId: string;
  applyForm: NestedForm;
  company: string;
  jobData: Extract<JobApplicationData, { applyMode: 'standard' }>;
  jobTitle: string;
  policy: CareerJob['recruitingPrivacy'];
  onSuccess?: () => void;
}

export function StandardApplicationForm({
  accountId,
  applyForm,
  company,
  jobData,
  jobTitle,
  policy,
  onSuccess,
}: StandardApplicationFormProps) {
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
  const { submit, isPending } = useApplyStandardJob({
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

  const isSubmitting = form.formState.isSubmitting || isPending;
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
