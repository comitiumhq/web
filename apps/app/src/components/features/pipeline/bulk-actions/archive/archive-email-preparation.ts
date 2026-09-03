import type { VaultKeyResponse } from '@comitium/schemas/vault';
import { getProductErrorMessage } from '@comitium/ui/product-error-messages';
import { toast } from 'sonner';
import type { BulkOperationEmailPayload } from '@/lib/schemas/bulk-operations';
import { canPrepareBulkEmail, prepareBulkEmailPayloads } from '../email/bulk-email-payloads';
import type { BulkEmailDraftController } from '../email/use-bulk-email-draft';
import type { PipelineBulkTarget } from '../model';

type ArchiveEmailPreparation = {
  emailTargets: readonly PipelineBulkTarget[];
  preparableEmailCount: number;
  draft: BulkEmailDraftController;
  orgId: string;
  vaultKey: VaultKeyResponse | undefined;
  onError: (message: string) => void;
};

export async function prepareArchiveEmailPayloads(
  params: ArchiveEmailPreparation,
): Promise<BulkOperationEmailPayload[] | null> {
  if (params.preparableEmailCount === 0) return [];

  const draftResult = params.draft.readDraft();

  if (!draftResult.draft) {
    toast.error(draftResult.error ?? 'Enter the candidate email.');
    return null;
  }

  if (!params.vaultKey) {
    toast.error('Organization encryption keys are unavailable.');
    return null;
  }

  try {
    const prepared = await prepareBulkEmailPayloads({
      targets: params.emailTargets.filter(canPrepareBulkEmail),
      draft: draftResult.draft,
      orgId: params.orgId,
      vaultKey: params.vaultKey,
      purpose: 'archive',
    });

    if (prepared.error) {
      params.onError(prepared.error);
      return null;
    }

    return prepared.payloads;
  } catch (error) {
    params.onError(getProductErrorMessage(error, 'The encrypted emails could not be prepared.'));
    return null;
  }
}
