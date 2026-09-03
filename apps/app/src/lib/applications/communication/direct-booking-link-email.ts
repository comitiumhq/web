import type { PublicEncryptionKey } from '@comitium/crypto';
import type { TipTapDoc } from '@comitium/schemas/common';
import { getRecipientKey } from '@/lib/api/applications-data';
import type { ComposeEmailData } from '@/lib/schemas/emails';
import type { SendDirectBookingLinkBody } from '@/lib/schemas/interviews';
import { prepareEncryptedEmailDelivery } from './email-delivery';

const LINK_TEXT = 'Choose an interview time';

interface PrepareSchedulingLinkEmailParams extends ComposeEmailData {
  applicationId: string;
  schedulingUrl: string;
  orgId: string;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  applicantEmail: string;
}

export async function prepareSchedulingLinkEmail(
  params: PrepareSchedulingLinkEmailParams,
): Promise<SendDirectBookingLinkBody> {
  const recipient = await getRecipientKey(params.applicationId);
  const messageDoc = appendSchedulingLink(params.messageDoc, params.schedulingUrl);
  const messageHtml = appendSchedulingLinkHtml(params.messageHtml, params.schedulingUrl);
  const delivery = await prepareEncryptedEmailDelivery({
    applicationId: params.applicationId,
    orgId: params.orgId,
    vaultPublicKey: params.vaultPublicKey,
    vaultKeyVersion: params.vaultKeyVersion,
    applicantPublicKey: recipient.publicKey,
    applicantEmail: params.applicantEmail,
    subject: params.subject,
    messageDoc,
    messageHtml,
  });

  return {
    content: delivery.content,
    deliveryGrant: delivery.deliveryGrant,
    emailTemplateId: params.emailTemplateId,
  };
}

export function createSchedulingEmailDoc(candidateFirstName?: string | null): TipTapDoc {
  const greeting = candidateFirstName ? `Hi ${candidateFirstName},` : 'Hi,';

  return {
    type: 'doc',
    content: [
      paragraph(greeting),
      paragraph('Please choose a time that works for you using the scheduling link below.'),
    ],
  };
}

function appendSchedulingLink(message: TipTapDoc, schedulingUrl: string): TipTapDoc {
  return {
    ...message,
    content: [
      ...(message.content ?? []),
      { type: 'paragraph' },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: LINK_TEXT,
            marks: [{ type: 'link', attrs: { href: schedulingUrl, target: '_blank', rel: 'noopener noreferrer' } }],
          },
        ],
      },
    ],
  };
}

function appendSchedulingLinkHtml(messageHtml: string, schedulingUrl: string): string {
  const safeUrl = schedulingUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

  return `${messageHtml}<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${LINK_TEXT}</a></p>`;
}

function paragraph(text: string): TipTapDoc {
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}
