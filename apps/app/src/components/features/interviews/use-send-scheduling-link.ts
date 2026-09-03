import type { PublicEncryptionKey } from '@comitium/crypto';
import type { TipTapDoc } from '@comitium/schemas/common';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCreateDirectBookingLink, useSendDirectBookingLink } from '@/hooks/mutations/use-interview-mutations';
import { prepareSchedulingLinkEmail } from '@/lib/applications/communication/direct-booking-link-email';
import type { CreateDirectBookingLinkResponse } from '@/lib/schemas/interviews';

type PendingLink = CreateDirectBookingLinkResponse['data'] & { applicationId: string };

export interface SchedulingLinkDraft {
  interviewId: string;
  durationMinutes: number;
  stageId: string;
  timeZone: string;
  interviewers: { userId: string; role: 'interviewer' | 'shadow' | 'lead' }[];
  subject: string;
  messageDoc: TipTapDoc;
  messageHtml: string;
  emailTemplateId: string | null;
}

interface UseSendSchedulingLinkParams {
  applicationId: string;
  orgId: string;
  applicantEmail: string | null;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
  onSent: () => void;
}

export function useSendSchedulingLink({
  applicationId,
  orgId,
  applicantEmail,
  vaultPublicKey,
  vaultKeyVersion,
  onSent,
}: UseSendSchedulingLinkParams) {
  const { mutateAsync: createLink, isPending: isCreating } = useCreateDirectBookingLink();
  const { mutateAsync: sendLink, isPending: isSending } = useSendDirectBookingLink();
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const isPreparingRef = useRef(false);

  const sendSchedulingLink = useCallback(
    async (draft: SchedulingLinkDraft) => {
      if (isPreparingRef.current) {
        return;
      }

      if (!applicantEmail) {
        toast.error('Candidate email is required');

        return;
      }

      if (!vaultPublicKey || !vaultKeyVersion) {
        toast.error('Vault key not available');

        return;
      }

      isPreparingRef.current = true;
      setIsPreparing(true);

      try {
        let link = pendingLink?.applicationId === applicationId ? pendingLink : null;

        if (!link) {
          try {
            const result = await createLink({
              applicationId,
              body: {
                interviewId: draft.interviewId,
                durationMinutes: draft.durationMinutes,
                stageId: draft.stageId,
                candidateEmail: applicantEmail,
                timeZone: draft.timeZone,
                interviewers: draft.interviewers,
              },
            });
            link = { ...result.data, applicationId };
            setPendingLink(link);
          } catch {
            return;
          }
        }

        let body: Awaited<ReturnType<typeof prepareSchedulingLinkEmail>>;

        try {
          body = await prepareSchedulingLinkEmail({
            applicationId,
            schedulingUrl: link.url,
            orgId,
            vaultPublicKey,
            vaultKeyVersion,
            applicantEmail,
            subject: draft.subject,
            messageDoc: draft.messageDoc,
            messageHtml: draft.messageHtml,
            emailTemplateId: draft.emailTemplateId ?? undefined,
          });
        } catch {
          toast.error('Could not prepare the scheduling email');

          return;
        }

        try {
          await sendLink({ applicationId, scheduleId: link.scheduleId, body });
        } catch {
          return;
        }

        setPendingLink(null);
        onSent();
      } finally {
        isPreparingRef.current = false;
        setIsPreparing(false);
      }
    },
    [applicantEmail, applicationId, createLink, onSent, orgId, pendingLink, sendLink, vaultKeyVersion, vaultPublicKey],
  );

  return {
    sendSchedulingLink,
    isPending: isCreating || isSending || isPreparing,
  };
}
