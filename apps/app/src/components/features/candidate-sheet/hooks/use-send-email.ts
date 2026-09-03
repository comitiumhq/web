import { useSession } from '@comitium/auth/use-session';
import type { PublicEncryptionKey } from '@comitium/crypto';
import { assertEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import type { ApplicationApiResponse } from '@comitium/schemas/applications';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSendEmailMutation } from '@/hooks/mutations/use-send-email-mutation';
import { getRecipientKey } from '@/lib/api/applications-data';
import type { ComposeEmailData } from '@/lib/schemas/emails';
import { getErrorMessage } from '@/lib/utils';

interface UseSendEmailOptions {
  application: ApplicationApiResponse | null;
  orgId: string;
  jobId: string;
  vaultPublicKey: PublicEncryptionKey | null | undefined;
  vaultKeyVersion: number | null | undefined;
  applicantEmail: string | null;
}

export interface SendEmailData extends ComposeEmailData {
  activityId?: string;
  onSuccess?: () => void;
  onError?: () => void;
}

export function useSendEmail({
  application,
  orgId,
  jobId,
  vaultPublicKey,
  vaultKeyVersion,
  applicantEmail,
}: UseSendEmailOptions) {
  const { mutate: sendEmailMutation, isPending: isSendingEmail } = useSendEmailMutation();
  const { user } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  const sendEmail = useCallback(
    async (data: SendEmailData) => {
      if (!application || isProcessingRef.current) {
        return;
      }

      if (!vaultPublicKey || !vaultKeyVersion) {
        toast.error('Vault key not available');
        data.onError?.();

        return;
      }

      if (!applicantEmail) {
        toast.error('Applicant email not available. Please decrypt application data first.');
        data.onError?.();

        return;
      }

      try {
        assertEncryptionKeyBundle(user);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Secure session is not ready. Please reload and try again.'));
        data.onError?.();

        return;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);

      let applicantPublicKey: PublicEncryptionKey | null;

      try {
        const result = await getRecipientKey(application.id);
        applicantPublicKey = result.publicKey;
      } catch {
        toast.error('Failed to fetch recipient key');
        isProcessingRef.current = false;
        setIsProcessing(false);
        data.onError?.();

        return;
      }

      const callbacks = {
        onSuccess: () => {
          isProcessingRef.current = false;
          setIsProcessing(false);
          data.onSuccess?.();
        },
        onError: () => {
          isProcessingRef.current = false;
          setIsProcessing(false);
          data.onError?.();
        },
      };

      sendEmailMutation(
        {
          applicationId: application.id,
          orgId,
          jobId,
          vaultPublicKey,
          vaultKeyVersion,
          applicantPublicKey,
          messageDoc: data.messageDoc,
          messageHtml: data.messageHtml,
          applicantEmail,
          subject: data.subject,
          emailTemplateId: data.emailTemplateId,
          activityId: data.activityId,
        },
        callbacks,
      );
    },
    [application, vaultPublicKey, vaultKeyVersion, applicantEmail, sendEmailMutation, orgId, jobId, user],
  );

  return { sendEmail, isSending: isProcessing || isSendingEmail };
}
