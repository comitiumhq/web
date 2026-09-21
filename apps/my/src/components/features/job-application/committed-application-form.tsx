import { useAccount } from '@comitium/auth/use-wallet';
import { fetchApplicantStakeAmount } from '@comitium/chain/job-config';
import type { CareerJob } from '@comitium/jobs/schemas';
import { STALE_TIME_SHORT, shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { ActionConfirmationNotice, BACKGROUND_CONFIRMATION_COPY } from '@comitium/ui/action-confirmation';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useApplyJob } from '@/hooks/mutations/use-apply-job';
import { qk } from '@/hooks/query-keys';
import { ApplicationFormContent } from './application-form-content';
import { ConfirmDialog } from './confirm-dialog';
import { type ApplicationFormController, useApplicationForm } from './use-application-form';

interface CommittedApplicationFormProps {
  accountId: string;
  applyForm: NestedForm;
  company: string;
  jobData: Extract<JobApplicationData, { applyMode: 'committed' }>;
  jobTitle: string;
  policy: CareerJob['recruitingPrivacy'];
  responseDeadlineDays: number | null;
  onSuccess?: () => void;
}

type PreparedSubmission = ReturnType<ApplicationFormController['prepareSubmission']>;

export function CommittedApplicationForm({
  accountId,
  applyForm,
  company,
  jobData,
  jobTitle,
  policy,
  responseDeadlineDays,
  onSuccess,
}: CommittedApplicationFormProps) {
  const { address, isConnected } = useAccount();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<PreparedSubmission | null>(null);

  const controller = useApplicationForm({
    accountId,
    applyForm,
    postingId: jobData.postingId,
    policy,
    onSuccess,
  });

  const { form, handleApplicationCompleted: completeApplication, prepareSubmission } = controller;

  const stakeQuery = useQuery({
    queryKey: qk.application.applicantStake(jobData.commitmentContract),
    queryFn: () => fetchApplicantStakeAmount(jobData.commitmentContract),
    retry: shouldRetryQuery,
    staleTime: STALE_TIME_SHORT,
  });

  const stakeAmount = stakeQuery.data ?? null;

  const handleApplicationCompleted = useCallback(() => {
    setShowConfirmDialog(false);
    completeApplication();
  }, [completeApplication]);

  const { submit, isPending, isConfirming } = useApplyJob({ onCompleted: handleApplicationCompleted });

  const handleSubmit = useCallback(
    (data: Record<string, unknown>) => {
      if (!isConnected || stakeAmount === null) {
        return;
      }

      setPendingSubmission(prepareSubmission(data));
      setShowConfirmDialog(true);
    },
    [isConnected, prepareSubmission, stakeAmount],
  );

  const handleConfirmSubmit = useCallback(() => {
    if (!isConnected || !address) {
      return;
    }

    if (!pendingSubmission || stakeAmount === null) {
      return;
    }

    submit({
      address,
      jobData,
      stakeAmount,
      formId: applyForm.form.id,
      ...pendingSubmission,
    });
  }, [address, applyForm.form.id, isConnected, jobData, pendingSubmission, stakeAmount, submit]);

  const isSubmitting = form.formState.isSubmitting || isPending;
  const stakeLoading = isConnected && stakeAmount === null && stakeQuery.isFetching;
  const isPrimaryPending = isSubmitting || stakeLoading;
  const primaryDisabled = isPrimaryPending || isConfirming || stakeAmount === null || responseDeadlineDays === null;
  const secondaryStatus = isConfirming && !showConfirmDialog ? <ActionConfirmationNotice /> : null;

  return (
    <>
      <ApplicationFormContent
        applyForm={applyForm}
        company={company}
        controller={controller}
        isPending={isPrimaryPending}
        jobTitle={jobTitle}
        onSubmit={handleSubmit}
        pendingLabel={stakeLoading ? 'Loading current deposit...' : 'Submitting...'}
        policy={policy}
        primaryDisabled={primaryDisabled}
        primaryLabel={isConfirming ? BACKGROUND_CONFIRMATION_COPY.actionLabel : 'Continue'}
        secondaryStatus={secondaryStatus}
      />

      {stakeAmount !== null && responseDeadlineDays !== null && (
        <ConfirmDialog
          open={isConnected && showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={handleConfirmSubmit}
          jobTitle={jobTitle}
          company={company}
          stakeAmount={stakeAmount}
          responseDeadlineDays={responseDeadlineDays}
          isSubmitting={isSubmitting}
          isConfirming={isConfirming}
        />
      )}
    </>
  );
}
