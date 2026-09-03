import { prepareEncryptedEmailDeliveryWithGrant } from '@/lib/applications/communication/email-delivery';
import type { BulkOperationEmailPayload } from '@/lib/schemas/bulk-operations';
import { tipTapToPlainText } from '@/lib/tiptap/tokens';
import { containsUnresolvedTemplateToken, renderEmailHtml, renderEmailTemplate } from '@/lib/utils/email-tokens';
import type { PipelineBulkTarget } from '../model';
import type { BulkEmailDraft } from './use-bulk-email-draft';

type BulkEmailPurpose = 'send' | 'archive';

type VaultKey = {
  vaultPublicKey: Parameters<typeof prepareEncryptedEmailDeliveryWithGrant>[0]['vaultPublicKey'];
  keyVersion: number;
};

export function canPrepareBulkEmail(target: PipelineBulkTarget): boolean {
  return resolveRecipient(target) !== null;
}

export async function prepareBulkEmailPayloads(params: {
  targets: readonly PipelineBulkTarget[];
  draft: BulkEmailDraft;
  orgId: string;
  vaultKey: VaultKey;
  purpose: BulkEmailPurpose;
}): Promise<{ payloads: BulkOperationEmailPayload[]; excludedItemIds: string[]; error: string | null }> {
  const payloads: BulkOperationEmailPayload[] = [];
  const excludedItemIds: string[] = [];
  let unresolvedCount = 0;

  for (const target of params.targets) {
    const recipient = resolveRecipient(target);

    if (!recipient) {
      excludedItemIds.push(target.item.id);
      continue;
    }

    const context = {
      candidateFirstName: recipient.profile.firstName,
      jobTitle: recipient.pipelineApplication.jobTitle,
      companyName: params.draft.companyName,
      senderName: params.draft.senderName,
      stageName: recipient.pipelineApplication.currentStageName,
    };
    const rendered = renderEmailTemplate({ subject: params.draft.subject, body: params.draft.messageDoc }, context);

    if (
      containsUnresolvedTemplateToken(rendered.subject) ||
      containsUnresolvedTemplateToken(tipTapToPlainText(rendered.body))
    ) {
      unresolvedCount += 1;
      continue;
    }

    const delivery = await prepareEncryptedEmailDeliveryWithGrant(
      {
        applicationId: target.item.selectedTargetId,
        orgId: params.orgId,
        vaultPublicKey: params.vaultKey.vaultPublicKey,
        vaultKeyVersion: params.vaultKey.keyVersion,
        applicantPublicKey: recipient.application.recipientPublicKey,
        applicantEmail: recipient.profile.email,
        subject: rendered.subject,
        messageDoc: rendered.body,
        messageHtml: renderEmailHtml(params.draft.messageHtml, context),
      },
      recipient.application.deliveryGrant,
    );

    payloads.push({
      itemId: target.item.id,
      content: delivery.content,
      deliveryGrantKey: delivery.deliveryGrant.deliveryGrantKey,
      emailTemplateId: params.draft.emailTemplateId,
    });
  }

  if (unresolvedCount > 0) {
    return {
      payloads: [],
      excludedItemIds: [],
      error: unresolvedTokenMessage(unresolvedCount, params.purpose),
    };
  }

  return { payloads, excludedItemIds, error: null };
}

function resolveRecipient(target: PipelineBulkTarget) {
  const { application, pipelineApplication, profile } = target;
  const deliveryGrant = application?.deliveryGrant;
  const email = profile?.email;
  const firstName = profile?.firstName;
  const isRecipientDataIncomplete = !application || !deliveryGrant || !pipelineApplication || !email;

  if (isRecipientDataIncomplete) return null;

  return {
    application: {
      recipientPublicKey: application.recipientPublicKey,
      deliveryGrant,
    },
    pipelineApplication,
    profile: { email, firstName },
  };
}

function unresolvedTokenMessage(count: number, purpose: BulkEmailPurpose) {
  const noun = count === 1 ? 'email has' : 'emails have';
  const activity = purpose === 'archive' ? 'archiving' : 'sending';

  return `${count} ${noun} unresolved personalization tokens. Edit the draft before ${activity}.`;
}
