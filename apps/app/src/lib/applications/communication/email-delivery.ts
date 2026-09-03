import {
  applicantRecipient,
  CryptoProxy,
  orgVaultRecipient,
  type PublicEncryptionKey,
  processorRecipient,
} from '@comitium/crypto';
import { emailContentContext } from '@comitium/crypto/context';
import type { EncryptedEnvelope, TipTapDoc } from '@comitium/schemas/common';
import { createEmailDeliveryGrant } from '@/lib/api/applications';
import type { EmailDeliveryGrantSubmission } from '@/lib/schemas/emails';

type EncryptedEmailDelivery = {
  content: EncryptedEnvelope;
  deliveryGrant: EmailDeliveryGrantSubmission;
};

export type EmailDeliveryGrantDraft = {
  id: string;
  recipient: string;
  processorPublicKey: PublicEncryptionKey;
};

export async function prepareEncryptedEmailDelivery(params: {
  applicationId: string;
  orgId: string;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  applicantPublicKey: PublicEncryptionKey | null;
  applicantEmail: string;
  subject: string;
  messageDoc: TipTapDoc;
  messageHtml: string;
}): Promise<EncryptedEmailDelivery> {
  const grant = await createEmailDeliveryGrant(params.applicationId);

  return prepareEncryptedEmailDeliveryWithGrant(params, grant);
}

export async function prepareEncryptedEmailDeliveryWithGrant(
  params: Parameters<typeof prepareEncryptedEmailDelivery>[0],
  grant: EmailDeliveryGrantDraft,
): Promise<EncryptedEmailDelivery> {
  const encrypted = await CryptoProxy.encryptEmailContentWithOverlays(
    {
      subject: params.subject,
      to: params.applicantEmail,
      body: params.messageDoc,
      htmlContent: params.messageHtml,
    },
    emailContentContext(params.orgId, params.applicationId),
    [
      orgVaultRecipient(params.vaultPublicKey, params.vaultKeyVersion),
      ...(params.applicantPublicKey ? [applicantRecipient(params.applicantPublicKey)] : []),
    ],
    [processorRecipient(grant.id, grant.processorPublicKey)],
  );
  const deliveryGrantKey = encrypted.overlayKeys[0];

  if (!deliveryGrantKey || deliveryGrantKey.recipient !== grant.recipient) {
    throw new Error('Email delivery grant key was not created');
  }

  return {
    content: encrypted.envelope,
    deliveryGrant: {
      deliveryGrantId: grant.id,
      deliveryGrantKey,
    },
  };
}
