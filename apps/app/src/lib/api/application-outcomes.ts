import type { EncryptedEnvelope } from '@comitium/schemas/common';
import { z } from 'zod';
import type { EmailDeliveryGrantSubmission } from '@/lib/schemas/emails';

import { api } from './client';

const archiveApplicationResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('accepted'), operationId: z.guid() }).strict(),
  z.object({ status: z.literal('completed') }).strict(),
]);

const reopenApplicationResponseSchema = z.object({
  status: z.literal('completed'),
  currentStageId: z.string(),
});

interface ApplicationNoticePayload {
  content: EncryptedEnvelope;
  deliveryGrant: EmailDeliveryGrantSubmission;
  emailTemplateId?: string;
}

export function archiveApplication(
  applicationId: string,
  payload: {
    archiveReasonId: string;
    notice: ApplicationNoticePayload | null;
  },
) {
  return api.post(`/applications/${applicationId}/archive`, payload, archiveApplicationResponseSchema);
}

export function reopenApplication(applicationId: string, payload: { targetStageId?: string }) {
  return api.post(`/applications/${applicationId}/reopen`, payload, reopenApplicationResponseSchema);
}
