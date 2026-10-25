import type { VaultKeyAccess } from '@comitium/crypto';
import { CryptoProxy } from '@comitium/crypto';
import { applicationAnswerBucketContext, feedbackAnswerBucketContext } from '@comitium/crypto/context';
import type { EncryptedEnvelope } from '@comitium/schemas/common';

export interface AnswerBucket {
  visibility: string;
  cryptoSubjectId: string;
  answers: EncryptedEnvelope;
}

export async function decryptFeedbackBuckets(
  orgId: string,
  formId: string,
  buckets: AnswerBucket[],
  vaultAccess: VaultKeyAccess,
): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {};

  for (const bucket of buckets) {
    const decrypted = await CryptoProxy.decryptApplication(
      bucket.answers,
      orgId,
      vaultAccess,
      feedbackAnswerBucketContext(orgId, bucket.cryptoSubjectId, formId, bucket.visibility),
    );

    Object.assign(merged, decrypted);
  }

  return merged;
}

export async function decryptAnswerBuckets(
  orgId: string,
  buckets: AnswerBucket[],
  vaultAccess: VaultKeyAccess,
): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {};

  for (const bucket of buckets) {
    const decrypted = await CryptoProxy.decryptApplication(
      bucket.answers,
      orgId,
      vaultAccess,
      applicationAnswerBucketContext(orgId, bucket.cryptoSubjectId, bucket.visibility),
    );

    Object.assign(merged, decrypted);
  }

  return merged;
}
