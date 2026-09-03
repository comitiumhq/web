import type { WrappedKey } from '@comitium/schemas/common';
import type { FormSubmissionResponse } from '@comitium/schemas/forms/form-submission';
import { useCallback, useMemo } from 'react';
import type { ApplicationFormState } from '@/components/features/application-submission/application-submission-view';
import { useCandidateIdentityInputs } from '@/hooks/use-candidate-identity-inputs';
import { useDecryptApplication } from '@/hooks/use-decrypt-application';
import { useDecryptFileMetadata } from '@/hooks/use-decrypt-file-metadata';
import { useDownloadApplicationFile } from '@/hooks/use-download-application-file';
import { mergeApplicationAnswers } from '@/lib/forms/application-answers';

interface UseInterviewBriefingApplicationParams {
  applicationId: string | null;
  enabled: boolean;
  interviewEventId: string;
  orgId: string;
  submission: FormSubmissionResponse | null;
  wrappedVaultKey: WrappedKey | undefined;
}

export function useInterviewBriefingApplication({
  applicationId,
  enabled,
  interviewEventId,
  orgId,
  submission,
  wrappedVaultKey,
}: UseInterviewBriefingApplicationParams): ApplicationFormState {
  const decryptedAnswers = useDecryptApplication(
    orgId,
    submission?.id ?? null,
    submission?.formId ?? null,
    submission?.answerEnvelopes ?? null,
    wrappedVaultKey,
  );

  const identityAnswers = useCandidateIdentityInputs({
    candidateIdentityInputs: submission?.candidateIdentityInputs ?? [],
    orgId,
    wrappedVaultKey,
    enabled,
  });

  const decryptedFileMeta = useDecryptFileMetadata(
    orgId,
    submission?.files.map((file) => ({ ...file, kind: 'attachment' })) ?? null,
    wrappedVaultKey,
  );

  const { download, downloadingQuestionId } = useDownloadApplicationFile({
    orgId,
    applicationId,
    interviewEventId,
    wrappedVaultKey,
  });

  const answers = useMemo(
    () => mergeApplicationAnswers(decryptedAnswers.data, identityAnswers.data),
    [decryptedAnswers.data, identityAnswers.data],
  );

  const decryptionError =
    decryptedAnswers.error ??
    decryptedFileMeta.error ??
    (identityAnswers.isError ? 'Failed to decrypt candidate identity inputs.' : null);

  const handleRetryDecryption = useCallback(() => {
    decryptedAnswers.retry();
    identityAnswers.refetch();
    decryptedFileMeta.retry();
  }, [decryptedAnswers.retry, decryptedFileMeta.retry, identityAnswers.refetch]);

  return {
    submission,
    answers,
    fileMeta: decryptedFileMeta.data,
    decryptionError,
    isDecrypting: decryptedAnswers.isDecrypting || identityAnswers.isLoading || decryptedFileMeta.isDecrypting,
    isLoading: false,
    isError: false,
    downloadingQuestionId,
    onRetryDecryption: handleRetryDecryption,
    onDownloadAttachment: download,
  };
}
