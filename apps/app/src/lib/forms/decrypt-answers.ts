import { CryptoProxy } from '@comitium/crypto';
import { applicationAnswerBucketContext, feedbackAnswerBucketContext } from '@comitium/crypto/context';
import type { EncryptedEnvelope, WrappedKey } from '@comitium/schemas/common';

export interface AnswerBucket {
  visibility: string;
  answers: EncryptedEnvelope;
}

export async function decryptFeedbackBuckets(
  orgId: string,
  applicationId: string,
  formId: string,
  buckets: AnswerBucket[],
  wrappedVaultKey: WrappedKey,
): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {};

  for (const bucket of buckets) {
    const decrypted = await CryptoProxy.decryptApplication(
      bucket.answers,
      orgId,
      wrappedVaultKey,
      feedbackAnswerBucketContext(orgId, applicationId, formId, bucket.visibility),
    );
    Object.assign(merged, decrypted);
  }

  return merged;
}

export async function decryptAnswerBuckets(
  orgId: string,
  formId: string,
  buckets: AnswerBucket[],
  wrappedVaultKey: WrappedKey,
): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {};

  for (const bucket of buckets) {
    const decrypted = await CryptoProxy.decryptApplication(
      bucket.answers,
      orgId,
      wrappedVaultKey,
      applicationAnswerBucketContext(orgId, formId, bucket.visibility),
    );
    Object.assign(merged, decrypted);
  }

  return merged;
}
