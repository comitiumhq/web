import { CryptoProxy, type EncryptedEnvelope, processorRecipient } from '@comitium/crypto';
import {
  applicationAnswerBucketContext,
  candidateIdentityInputContext,
  candidateProfileInputContext,
  encryptedFileContext,
  encryptedFileMetadataContext,
} from '@comitium/crypto/context';
import type { EnvelopeKey } from '@comitium/crypto/schemas';
import type {
  ApplicationPrepare,
  ProcessingGrantWrappedKey,
  StandardFinalizeApplicationInput,
} from '@comitium/schemas/applications';
import type { CandidateProfileInputValue } from '@comitium/schemas/forms/application-required-fields';
import type { AnswerVisibility } from '@comitium/schemas/forms/visibility';
import { isDefined } from '@comitium/schemas/guards';
import type { VaultKeyResponse } from '@comitium/schemas/vault';
import { reserveApplicationFile, uploadApplicationFile } from '@/lib/api/applications';
import type { CandidateIdentityInputValue } from '@/lib/forms/candidate-identity-inputs';

export interface ApplyAnswerBucket {
  visibility: AnswerVisibility;
  questionIds: string[];
  answers: Record<string, unknown>;
}

export interface ApplyFileUpload {
  fileId: string;
  questionId: string;
  visibility: AnswerVisibility;
  file: File;
}

export type ApplicationIntakeStep = 'encrypting' | 'submitting';

export interface ApplicationIntakeParams {
  orgId: string;
  formId: string;
  answerBuckets: ApplyAnswerBucket[];
  candidateIdentityInputs: CandidateIdentityInputValue[];
  candidateProfileInput: CandidateProfileInputValue;
  aiCriteriaEvaluation: {
    policyEnabled: boolean;
    optOut: boolean;
  };
  resumeUpload: { fileId: string; questionId: string; file: File } | null;
  fileUploads: ApplyFileUpload[];
}

interface EncryptedUpload {
  fileId: string;
  questionId: string;
  kind: 'resume' | 'attachment';
  visibility: AnswerVisibility;
  declaredMimeType: string;
  metadata: EncryptedEnvelope;
  ciphertext: Blob;
  processorKey: EnvelopeKey | null;
}

interface EncryptedCandidateIdentityInput {
  identity: CandidateIdentityInputValue;
  encrypted: {
    envelope: EncryptedEnvelope;
    wrappedKey: EnvelopeKey | null;
  };
}

interface EncryptedCandidateProfileInput {
  envelope: EncryptedEnvelope;
  wrappedKey: EnvelopeKey;
}

function processingIdentityKey(
  applicationId: string,
  input: EncryptedCandidateIdentityInput,
): ProcessingGrantWrappedKey | null {
  if (!input.encrypted.wrappedKey) {
    return null;
  }

  return {
    slot: 'identity',
    purpose: 'candidate_identity_input',
    subjectId: applicationId,
    fieldId: input.identity.questionId,
    wrappedKey: input.encrypted.wrappedKey,
  };
}

function processingProfileKey(applicationId: string, input: EncryptedCandidateProfileInput): ProcessingGrantWrappedKey {
  return {
    slot: 'profile',
    purpose: 'candidate_profile_input',
    subjectId: applicationId,
    fieldId: 'profile',
    wrappedKey: input.wrappedKey,
  };
}

function buildProcessingGrantWrappedKeys(
  applicationId: string,
  identities: EncryptedCandidateIdentityInput[],
  profile: EncryptedCandidateProfileInput,
  uploads: EncryptedUpload[],
): ProcessingGrantWrappedKey[] {
  const identityKeys = identities.map((identity) => processingIdentityKey(applicationId, identity)).filter(isDefined);
  const resume = uploads.find((upload) => upload.kind === 'resume' && upload.processorKey !== null);
  const wrappedKeys = [...identityKeys, processingProfileKey(applicationId, profile)];

  if (!resume?.processorKey) {
    return wrappedKeys;
  }

  return [
    ...wrappedKeys,
    {
      slot: 'resume',
      purpose: 'encrypted_file',
      subjectId: resume.fileId,
      fieldId: 'resume',
      wrappedKey: resume.processorKey,
    },
  ];
}

function assertValidCandidateIdentityInputs(inputs: CandidateIdentityInputValue[]): void {
  const questionIds = new Set(inputs.map((identity) => identity.questionId));

  if (inputs.length === 0) {
    throw new Error('Candidate identity inputs are required');
  }

  if (questionIds.size !== inputs.length) {
    throw new Error('Candidate identity question IDs must be unique');
  }

  if (inputs.some((identity) => identity.value.length === 0)) {
    throw new Error('Candidate identity values must not be empty');
  }
}

function assertFilePolicy(prepare: ApplicationPrepare, kind: 'resume' | 'attachment', file: File): void {
  const policy = prepare.filePolicy.kinds[kind];

  if (!policy) {
    throw new Error(`${kind} uploads are not allowed for this application`);
  }

  if (file.size > policy.maxPlaintextBytes || !policy.mimeTypes.includes(file.type)) {
    throw new Error(`${file.name} does not meet the application file policy`);
  }
}

async function encryptAnswers(key: VaultKeyResponse, orgId: string, formId: string, buckets: ApplyAnswerBucket[]) {
  return Promise.all(
    buckets.map(async (bucket) => ({
      visibility: bucket.visibility,
      questionIds: bucket.questionIds,
      answers: await CryptoProxy.encryptApplication(
        key.vaultPublicKey,
        key.keyVersion,
        bucket.answers,
        applicationAnswerBucketContext(orgId, formId, bucket.visibility),
      ),
    })),
  );
}

async function encryptCandidateIdentityInput(
  key: VaultKeyResponse,
  orgId: string,
  prepare: ApplicationPrepare,
  identity: ApplicationIntakeParams['candidateIdentityInputs'][number],
) {
  const payload = { questionId: identity.questionId, value: identity.value };
  const context = candidateIdentityInputContext(orgId, prepare.applicationId, identity.questionId);

  if (!identity.processorAccess) {
    return {
      envelope: await CryptoProxy.encryptApplication(key.vaultPublicKey, key.keyVersion, payload, context),
      wrappedKey: null,
    };
  }

  const grant = prepare.processingGrant;
  const encrypted = await CryptoProxy.encryptApplicationWithOverlays(
    key.vaultPublicKey,
    key.keyVersion,
    payload,
    context,
    [processorRecipient(grant.id, grant.processorPublicKey)],
  );
  const wrappedKey = encrypted.overlayKeys[0];

  if (!wrappedKey) {
    throw new Error('Candidate identity processing key was not produced');
  }

  return { envelope: encrypted.envelope, wrappedKey };
}

async function encryptCandidateProfileInput(
  key: VaultKeyResponse,
  orgId: string,
  prepare: ApplicationPrepare,
  profile: CandidateProfileInputValue,
): Promise<EncryptedCandidateProfileInput> {
  const encrypted = await CryptoProxy.encryptApplicationWithOverlays(
    key.vaultPublicKey,
    key.keyVersion,
    profile,
    candidateProfileInputContext(orgId, prepare.applicationId),
    [processorRecipient(prepare.processingGrant.id, prepare.processingGrant.processorPublicKey)],
  );
  const wrappedKey = encrypted.overlayKeys[0];

  if (!wrappedKey) {
    throw new Error('Candidate profile processing key was not produced');
  }

  return { envelope: encrypted.envelope, wrappedKey };
}

async function encryptUpload(
  key: VaultKeyResponse,
  orgId: string,
  prepare: ApplicationPrepare,
  upload: ApplyFileUpload,
  kind: 'resume' | 'attachment',
): Promise<EncryptedUpload> {
  assertFilePolicy(prepare, kind, upload.file);
  const context = encryptedFileContext(orgId, upload.fileId, kind);
  const [{ ciphertext, processorKey }, metadata] = await Promise.all([
    encryptUploadContent(key, prepare, upload.file, context, kind),
    CryptoProxy.encryptApplication(
      key.vaultPublicKey,
      key.keyVersion,
      { fileName: upload.file.name, mimeType: upload.file.type, originalSize: upload.file.size },
      encryptedFileMetadataContext(orgId, upload.fileId, kind),
    ),
  ]);

  return {
    fileId: upload.fileId,
    questionId: upload.questionId,
    kind,
    visibility: upload.visibility,
    declaredMimeType: upload.file.type,
    metadata,
    ciphertext: new Blob([ciphertext.buffer as ArrayBuffer], { type: 'application/octet-stream' }),
    processorKey,
  };
}

async function encryptUploadContent(
  key: VaultKeyResponse,
  prepare: ApplicationPrepare,
  file: File,
  context: ReturnType<typeof encryptedFileContext>,
  kind: 'resume' | 'attachment',
): Promise<{ ciphertext: Uint8Array; processorKey: EnvelopeKey | null }> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (kind === 'attachment') {
    const ciphertext = await CryptoProxy.encryptFile(key.vaultPublicKey, key.keyVersion, bytes, context);

    return { ciphertext, processorKey: null };
  }

  const grant = prepare.processingGrant;
  const encrypted = await CryptoProxy.encryptFileWithOverlays(key.vaultPublicKey, key.keyVersion, bytes, context, [
    processorRecipient(grant.id, grant.processorPublicKey),
  ]);

  return {
    ciphertext: encrypted.blob,
    processorKey: encrypted.overlayKeys[0] ?? null,
  };
}

function encryptUploads(
  key: VaultKeyResponse,
  orgId: string,
  prepare: ApplicationPrepare,
  resumeUpload: ApplicationIntakeParams['resumeUpload'],
  fileUploads: ApplyFileUpload[],
): Promise<EncryptedUpload[]> {
  const attachments = fileUploads.map((upload) => encryptUpload(key, orgId, prepare, upload, 'attachment'));

  if (resumeUpload === null) {
    return Promise.all(attachments);
  }

  return Promise.all([
    encryptUpload(key, orgId, prepare, { ...resumeUpload, visibility: 'standard' }, 'resume'),
    ...attachments,
  ]);
}

async function stageUpload(applicationId: string, upload: EncryptedUpload): Promise<string> {
  const reservation = await reserveApplicationFile(applicationId, {
    fileId: upload.fileId,
    kind: upload.kind,
    questionId: upload.questionId,
    visibility: upload.visibility,
    encryptedMetadata: upload.metadata,
    declaredMimeType: upload.declaredMimeType,
    expectedEncryptedBytes: upload.ciphertext.size,
  });

  await uploadApplicationFile(applicationId, upload.fileId, reservation.uploadToken, upload.ciphertext);

  return upload.fileId;
}

export async function prepareApplicationFinalization(
  prepared: ApplicationPrepare,
  params: ApplicationIntakeParams,
): Promise<StandardFinalizeApplicationInput> {
  assertValidCandidateIdentityInputs(params.candidateIdentityInputs);
  const [encryptedAnswers, encryptedIdentities, encryptedProfile, uploads] = await Promise.all([
    encryptAnswers(prepared.vaultKey, params.orgId, params.formId, params.answerBuckets),
    Promise.all(
      params.candidateIdentityInputs.map(async (identity) => ({
        identity,
        encrypted: await encryptCandidateIdentityInput(prepared.vaultKey, params.orgId, prepared, identity),
      })),
    ),
    encryptCandidateProfileInput(prepared.vaultKey, params.orgId, prepared, params.candidateProfileInput),
    encryptUploads(prepared.vaultKey, params.orgId, prepared, params.resumeUpload, params.fileUploads),
  ]);

  const uploadedFileIds = await Promise.all(uploads.map((upload) => stageUpload(prepared.applicationId, upload)));

  return {
    formSnapshotHash: prepared.formSnapshotHash,
    candidateIdentityInputs: encryptedIdentities.map(({ identity, encrypted }) => ({
      questionId: identity.questionId,
      envelope: encrypted.envelope,
    })),
    candidateProfileInput: encryptedProfile.envelope,
    answerEnvelopes: encryptedAnswers,
    uploadedFileIds,
    aiCriteriaEvaluation: params.aiCriteriaEvaluation,
    processingGrantId: prepared.processingGrant.id,
    wrappedKeys: buildProcessingGrantWrappedKeys(
      prepared.applicationId,
      encryptedIdentities,
      encryptedProfile,
      uploads,
    ),
  };
}
