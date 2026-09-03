import type { EncryptedEnvelope } from '@comitium/crypto/schemas';
import { applicationSchema, emailDeliveryGrantSchema } from '@comitium/schemas/applications';
import { successSchema } from '@comitium/schemas/public';
import type { EmailDeliveryGrantSubmission } from '@/lib/schemas/emails';

import { api } from './client';

export function getApplication(applicationId: string) {
  return api.get(`/applications/${applicationId}`, applicationSchema);
}

export function createEmailDeliveryGrant(applicationId: string) {
  return api.post(`/applications/${applicationId}/email-delivery-grants`, {}, emailDeliveryGrantSchema);
}

interface SendApplicationEmailBody {
  content: EncryptedEnvelope;
  deliveryGrant: EmailDeliveryGrantSubmission;
  emailTemplateId?: string;
  activityId?: string;
}

export function sendApplicationEmail(applicationId: string, body: SendApplicationEmailBody) {
  return api.post(`/applications/${applicationId}/send-email`, body, successSchema);
}
