import type { ApplicationApiResponse } from '@comitium/schemas/applications';
import { formatCandidateName } from '@comitium/schemas/candidates';
import { resolveApplicationResponseEmail } from '@comitium/schemas/forms/application-email';
import { useCallback, useMemo, useRef } from 'react';
import { useQueryPipeline } from '@/hooks/queries/use-query-pipeline';
import { useCandidateIdentityInputs } from '@/hooks/use-candidate-identity-inputs';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { mergeApplicationAnswers } from '@/lib/forms/application-answers';
import { Permission } from '@/lib/schemas/org';
import type { InterviewStage } from '@/lib/schemas/pipeline';
import { getCandidateDisplayName } from '@/lib/utils';

import { useApplicationDetail } from '../hooks/use-application-detail';
import { useDecryptProfile } from '../hooks/use-decrypt-profile';
import { useProjectFormSubmission } from '../hooks/use-project-form-submission';

interface UseCandidateSheetModelParams {
  applicationId: string | null;
  jobId: string;
  orgId: string;
  stages?: InterviewStage[];
  open: boolean;
}

export function useCandidateSheetModel({ applicationId, jobId, orgId, stages, open }: UseCandidateSheetModelParams) {
  const detail = useApplicationDetail({ applicationId, orgId, open });
  const lastApplicationRef = useRef<ApplicationApiResponse | null>(null);

  if (open && detail.application) {
    lastApplicationRef.current = detail.application;
  }

  const application = open ? detail.application : lastApplicationRef.current;
  const effectiveJobId = application?.considerationContext.job.id ?? jobId;

  const {
    profile: decryptedProfile,
    isLoading: isLoadingProfile,
    hasEncryptedProfile,
    queryError: profileQueryError,
    decryptionError: profileDecryptionError,
    retryQuery: retryProfileQuery,
  } = useDecryptProfile(application?.candidateId, orgId, detail.wrappedVaultKey);

  const { canOnJob } = useJobPermissions(effectiveJobId);
  const canReadCandidateIdentityInputs = canOnJob(Permission.APPLICATION_READ);

  const candidateIdentityInputsQuery = useCandidateIdentityInputs({
    candidateIdentityInputs: detail.formSubmission?.candidateIdentityInputs ?? [],
    orgId,
    wrappedVaultKey: detail.wrappedVaultKey,
    enabled: open && canReadCandidateIdentityInputs,
  });
  const decryptedData = useMemo(
    () => mergeApplicationAnswers(detail.decryptedData, candidateIdentityInputsQuery.data),
    [candidateIdentityInputsQuery.data, detail.decryptedData],
  );

  const formDecryptionError =
    detail.formDecryptionError ??
    detail.fileMetadataDecryptionError ??
    (candidateIdentityInputsQuery.isError ? 'Failed to decrypt form answers.' : null);
  const isDecryptingForm =
    detail.isDecryptingForm || detail.isDecryptingFileMetadata || candidateIdentityInputsQuery.isLoading;

  const retryFormDecryption = useCallback(async () => {
    await Promise.all([
      detail.retryFormDecryption(),
      detail.retryFileMetadataDecryption(),
      candidateIdentityInputsQuery.refetch(),
    ]);
  }, [candidateIdentityInputsQuery.refetch, detail.retryFileMetadataDecryption, detail.retryFormDecryption]);

  const decryptedEmail = resolveApplicationResponseEmail({
    profileEmail: decryptedProfile?.email ?? null,
    form: detail.formSubmission?.formSnapshot ?? null,
    values: decryptedData,
  });
  const candidateFirstName = decryptedProfile?.firstName ?? null;
  const candidateName = formatCandidateName(decryptedProfile);

  useProjectFormSubmission({
    orgId,
    candidateId: application?.candidateId ?? null,
    formId: detail.formSubmission?.formId ?? null,
    submissionId: detail.formSubmission?.id ?? null,
    decryptedAnswers: decryptedData,
    enabled: application?.considerationContext.capabilities.candidate.canEditProfile === true,
  });

  const canUseProvidedStages = effectiveJobId === jobId && Boolean(stages?.length);
  const { data: pipelineData } = useQueryPipeline(!canUseProvidedStages && open ? effectiveJobId : null);
  const resolvedStages = canUseProvidedStages ? stages : pipelineData?.stages;

  const displayName = application
    ? getCandidateDisplayName({
        applicationId: application.id,
        candidateId: application.candidateId,
        profile: decryptedProfile,
      })
    : null;

  return {
    ...detail,
    decryptedData,
    formDecryptionError,
    isDecryptingForm,
    retryFormDecryption,
    application,
    decryptedProfile,
    isLoadingProfile,
    hasEncryptedProfile,
    profileQueryError,
    profileDecryptionError,
    retryProfileQuery,
    candidateFirstName,
    candidateName,
    decryptedEmail,
    effectiveJobId,
    resolvedStages,
    displayName,
  };
}
