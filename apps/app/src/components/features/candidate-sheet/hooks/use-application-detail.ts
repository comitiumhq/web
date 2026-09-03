import { useEffect } from 'react';

import { useQueryApplication } from '@/hooks/queries/use-query-application';
import { useQueryApplicationFormSubmission } from '@/hooks/queries/use-query-application-form-submission';
import { useQueryEmails } from '@/hooks/queries/use-query-emails';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import { useDecryptApplication } from '@/hooks/use-decrypt-application';
import { useDecryptEmails } from '@/hooks/use-decrypt-emails';
import { useDecryptFileMetadata } from '@/hooks/use-decrypt-file-metadata';
import { useDecryptResume } from '@/hooks/use-decrypt-resume';
import { useDownloadApplicationFile } from '@/hooks/use-download-application-file';

interface UseApplicationDetailOptions {
  applicationId: string | null;
  orgId: string;
  open: boolean;
}

export function useApplicationDetail({ applicationId, orgId, open }: UseApplicationDetailOptions) {
  const { data: application, isLoading: isLoadingApplication } = useQueryApplication(open ? applicationId : null);
  const { data: vaultKeyData } = useQueryOrgVaultKey(open ? orgId : undefined);
  const {
    data: wrappedVaultKey,
    isLoading: isLoadingWrappedVaultKey,
    isError: isWrappedVaultKeyError,
    refetch: refetchWrappedVaultKey,
  } = useQueryWrappedVaultKey(open ? orgId : undefined);
  const emailsQuery = useQueryEmails(open && application ? application.id : null);
  const encryptedEmails = emailsQuery.data;
  const hasEncryptedEmails = Boolean(encryptedEmails?.length);

  const {
    data: decryptedEmails,
    error: emailDecryptionError,
    isDecrypting: isDecryptingEmails,
    reset: resetEmails,
    retry: retryEmailDecryption,
  } = useDecryptEmails(orgId, application?.id ?? null, encryptedEmails, true, wrappedVaultKey);

  const formSubmissionQuery = useQueryApplicationFormSubmission(open && application ? application.id : null);
  const formSubmission = formSubmissionQuery.data;

  const {
    data: decryptedData,
    error: formDecryptionError,
    isDecrypting: isDecryptingForm,
    reset,
    retry: retryFormDecryption,
  } = useDecryptApplication(
    orgId,
    formSubmission?.id ?? null,
    formSubmission?.formId ?? null,
    formSubmission?.answerEnvelopes ?? null,
    wrappedVaultKey,
  );

  const {
    pdfData,
    isLoading: isResumeLoading,
    error: resumeError,
    downloadResume,
    reset: resetResume,
  } = useDecryptResume(
    orgId,
    application?.id ?? null,
    !!application?.hasResume,
    application?.resumeFileId ?? null,
    wrappedVaultKey,
  );

  const {
    data: decryptedFileMeta,
    error: fileMetadataDecryptionError,
    isDecrypting: isDecryptingFileMetadata,
    reset: resetFileMeta,
    retry: retryFileMetadataDecryption,
  } = useDecryptFileMetadata(
    orgId,
    formSubmission?.files.map((file) => ({ ...file, kind: 'attachment' })) ?? null,
    wrappedVaultKey,
  );

  const { download: downloadApplicationFile, downloadingQuestionId } = useDownloadApplicationFile({
    orgId,
    applicationId: application?.id ?? null,
    wrappedVaultKey,
  });

  useEffect(() => {
    if (!applicationId || !open) {
      reset();
      resetResume();
      resetEmails();
      resetFileMeta();
    }
  }, [applicationId, open, reset, resetResume, resetEmails, resetFileMeta]);

  return {
    application: application ?? null,
    isLoadingApplication,
    vaultKeyData,
    wrappedVaultKey,
    formSubmission,
    decryptedData,
    formDecryptionError,
    isDecryptingForm,
    retryFormDecryption,
    isLoadingFormSubmission: formSubmissionQuery.isLoading,
    isFormSubmissionError: formSubmissionQuery.isError && formSubmission === undefined,
    refetchFormSubmission: formSubmissionQuery.refetch,
    fileMetadataDecryptionError,
    isDecryptingFileMetadata,
    retryFileMetadataDecryption,
    decryptedEmails,
    emailDecryptionError,
    isDecryptingEmails,
    retryEmailDecryption,
    isLoadingEmails: emailsQuery.isLoading,
    isEmailsError: emailsQuery.isError && encryptedEmails === undefined,
    refetchEmails: emailsQuery.refetch,
    isLoadingEmailDecryptionKey: hasEncryptedEmails && isLoadingWrappedVaultKey && !wrappedVaultKey,
    isEmailDecryptionKeyError: hasEncryptedEmails && isWrappedVaultKeyError && !wrappedVaultKey,
    refetchEmailDecryptionKey: refetchWrappedVaultKey,
    fetchNextEmailsPage: emailsQuery.fetchNextPage,
    hasNextEmailsPage: Boolean(emailsQuery.hasNextPage),
    isFetchingNextEmailsPage: emailsQuery.isFetchingNextPage,
    isFetchNextEmailsPageError: emailsQuery.isFetchNextPageError,
    decryptedFileMeta,
    pdfData,
    isResumeLoading,
    resumeError,
    downloadResume,
    downloadApplicationFile,
    downloadingQuestionId,
  };
}
