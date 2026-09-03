import type { PublicEncryptionKey } from '@comitium/crypto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { sendApplicationEmail } from '@/lib/api/applications';
import { prepareEncryptedEmailDelivery } from '@/lib/applications/communication/email-delivery';
import type { ComposeEmailData } from '@/lib/schemas/emails';

interface SendEmailMutationParams extends ComposeEmailData {
  applicationId: string;
  orgId: string;
  jobId: string;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  applicantPublicKey: PublicEncryptionKey | null;
  applicantEmail: string;
  activityId?: string;
}

export function useSendEmailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendEmailMutationParams) => {
      const toastId = toast.loading('Encrypting email...');

      try {
        const delivery = await prepareEncryptedEmailDelivery(params);

        toast.loading('Sending email...', { id: toastId });

        await sendApplicationEmail(params.applicationId, {
          content: delivery.content,
          deliveryGrant: delivery.deliveryGrant,
          emailTemplateId: params.emailTemplateId,
          activityId: params.activityId,
        });

        toast.success('Email sent', { id: toastId });
      } catch (error) {
        toast.error('Failed to send email. Please try again.', { id: toastId });
        throw error;
      }
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.jobs.kanbanRoot(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: qk.application.detail(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: qk.application.emails(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
      queryClient.invalidateQueries({ queryKey: qk.pipeline.root() });
    },
  });
}
