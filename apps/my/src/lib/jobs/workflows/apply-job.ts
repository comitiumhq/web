import {
  submitPreparedUserWalletOnchainOperation,
  type UserWalletOperationSubmission,
} from '@comitium/auth/user-wallet-operation';
import { waitForOperationReceipt } from '@comitium/chain/onchain-operation-observer';
import { CryptoProxy, type EncryptedEnvelope, processorRecipient } from '@comitium/crypto';
import {
  applicationAnswerBucketContext,
  candidateIdentityInputContext,
  candidateProfileInputContext,
  encryptedFileContext,
  encryptedFileMetadataContext,
} from '@comitium/crypto/context';
import type { EnvelopeKey } from '@comitium/crypto/schemas';
import { isApiError } from '@comitium/schemas/api-errors';
import type {
  ApplicationPrepare,
  ApplicationSubmitDisposition,
  FinalizeApplicationInput,
  ProcessingGrantWrappedKey,
  UserWalletApplicationRequest,
} from '@comitium/schemas/applications';
import { getErrorMessage } from '@comitium/schemas/error';
import type { CandidateProfileInputValue } from '@comitium/schemas/forms/application-required-fields';
import type { FormSubmissionFieldValue } from '@comitium/schemas/forms/form-submission';
import type { AnswerVisibility } from '@comitium/schemas/forms/visibility';
import { isDefined } from '@comitium/schemas/guards';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import {
  type ApplicationResult,
  ContractError,
  EncryptionError,
  type JobError,
  SignatureError,
  TransactionError,
} from '@comitium/schemas/product-errors';
import type { VaultKeyResponse } from '@comitium/schemas/vault';
import { ResultAsync } from 'neverthrow';
import type { Address } from 'viem';
import {
  finalizeApplication,
  prepareApplication,
  reserveApplicationFile,
  retryApplicationOnchainOperation,
  uploadApplicationFile,
} from '@/lib/api/applications';
import { deriveApplicationId, generateApplicationSalt } from '@/lib/eip712';
import type { CandidateIdentityInputValue } from '@/lib/forms/candidate-identity-inputs';
import { validateApplicationData } from '../core/validation';

export type WorkflowStep = 'encrypting' | 'signing' | 'submitting';

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

export interface ApplyJobWorkflowParams {
  address: Address;
  jobData: JobApplicationData;
  stakeAmount: bigint;
  formId: string;
  answerBuckets: ApplyAnswerBucket[];
  fieldValues: FormSubmissionFieldValue[];
  candidateIdentityInputs: CandidateIdentityInputValue[];
  candidateProfileInput: CandidateProfileInputValue;
  aiCriteriaEvaluation: {
    policyEnabled: boolean;
    optOut: boolean;
  };
  resumeUpload: { fileId: string; questionId: string; file: File } | null;
  fileUploads: ApplyFileUpload[];
  onStep?: (step: WorkflowStep) => void;
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
  identity: ApplyJobWorkflowParams['candidateIdentityInputs'][number],
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
  resumeUpload: ApplyJobWorkflowParams['resumeUpload'],
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

async function prepareApplicationFinalization(
  prepared: ApplicationPrepare,
  params: {
    stakeAmount: bigint;
    jobData: JobApplicationData;
    formId: string;
    answerBuckets: ApplyAnswerBucket[];
    fieldValues: FormSubmissionFieldValue[];
    candidateIdentityInputs: CandidateIdentityInputValue[];
    candidateProfileInput: CandidateProfileInputValue;
    aiCriteriaEvaluation: ApplyJobWorkflowParams['aiCriteriaEvaluation'];
    resumeUpload: ApplyJobWorkflowParams['resumeUpload'];
    fileUploads: ApplyFileUpload[];
  },
): Promise<FinalizeApplicationInput> {
  assertValidCandidateIdentityInputs(params.candidateIdentityInputs);
  const applicationSalt = generateApplicationSalt();
  const applicationId = deriveApplicationId({
    chainId: params.jobData.chainId,
    commitmentContract: params.jobData.commitmentContract,
    jobId: params.jobData.jobId,
    jobUuid: params.jobData.id,
    applicationUuid: prepared.applicationId,
    salt: applicationSalt,
  });
  const [encryptedAnswers, encryptedIdentities, encryptedProfile, uploads] = await Promise.all([
    encryptAnswers(prepared.vaultKey, params.jobData.orgId, params.formId, params.answerBuckets),
    Promise.all(
      params.candidateIdentityInputs.map(async (identity) => ({
        identity,
        encrypted: await encryptCandidateIdentityInput(prepared.vaultKey, params.jobData.orgId, prepared, identity),
      })),
    ),
    encryptCandidateProfileInput(prepared.vaultKey, params.jobData.orgId, prepared, params.candidateProfileInput),
    encryptUploads(prepared.vaultKey, params.jobData.orgId, prepared, params.resumeUpload, params.fileUploads),
  ]);
  const uploadedFileIds = await Promise.all(uploads.map((upload) => stageUpload(prepared.applicationId, upload)));

  return {
    applicationId,
    applicationSalt,
    stake: params.stakeAmount.toString(),
    formSnapshotHash: prepared.formSnapshotHash,
    candidateIdentityInputs: encryptedIdentities.map(({ identity, encrypted }) => ({
      questionId: identity.questionId,
      envelope: encrypted.envelope,
    })),
    candidateProfileInput: encryptedProfile.envelope,
    answerEnvelopes: encryptedAnswers,
    fieldValues: params.fieldValues,
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

function sendApplication(
  operation: UserWalletApplicationRequest,
): ResultAsync<UserWalletOperationSubmission, TransactionError> {
  return ResultAsync.fromPromise(
    submitPreparedUserWalletOnchainOperation(operation),
    (error) => new TransactionError('sendApplication', error),
  );
}

async function resolveDisposition(disposition: ApplicationSubmitDisposition): Promise<ApplicationResult> {
  if (disposition.state === 'completed') {
    return { kind: 'completed', operationId: disposition.operationId };
  }

  if (disposition.state === 'confirming') {
    const receipt = await waitForOperationReceipt(disposition.operationId);

    return { kind: receipt.kind, operationId: disposition.operationId };
  }

  if (disposition.state !== 'wallet_confirmation') {
    throw new Error('Request a new wallet confirmation to submit this application.');
  }

  const operation = disposition.operation;
  const submission = await sendApplication(operation).match(
    (value) => value,
    (error) => Promise.reject(error),
  );

  return { kind: submission.kind, operationId: operation.operationId };
}

function toSignatureError(error: unknown): SignatureError {
  if (isApiError(error)) {
    return new SignatureError(error.status, error.message, error.code);
  }

  return new SignatureError(0, getErrorMessage(error));
}

async function resolveApplicationSubmission(
  submission: ApplicationSubmission,
  stakeAmount: bigint,
  onSubmission: () => void,
): Promise<ApplicationResult> {
  let disposition = submission.disposition;

  if (submission.kind === 'existing' && disposition.state === 'try_again') {
    disposition = await retryApplicationOnchainOperation(
      submission.applicationId,
      disposition.operationId,
      stakeAmount.toString(),
    );
  }

  if (disposition.state === 'wallet_confirmation') {
    onSubmission();
  }

  return resolveDisposition(disposition);
}

interface ApplicationSubmission {
  kind: 'prepared' | 'existing';
  applicationId: string;
  disposition: ApplicationSubmitDisposition;
}

function resolveApplicationSubmissionResult(
  submission: ApplicationSubmission,
  stakeAmount: bigint,
  onSubmission: () => void,
): ResultAsync<ApplicationResult, JobError> {
  return ResultAsync.fromPromise(resolveApplicationSubmission(submission, stakeAmount, onSubmission), (error) => {
    if (error instanceof TransactionError || error instanceof ContractError) {
      return error;
    }

    return toSignatureError(error);
  });
}

export function applyJobWorkflow(params: ApplyJobWorkflowParams): ResultAsync<ApplicationResult, JobError> {
  const {
    address,
    jobData,
    stakeAmount,
    formId,
    answerBuckets,
    fieldValues,
    candidateIdentityInputs,
    candidateProfileInput,
    aiCriteriaEvaluation,
    resumeUpload,
    fileUploads,
    onStep,
  } = params;
  const step = (value: WorkflowStep) => onStep?.(value);

  return validateApplicationData(jobData, address, stakeAmount)
    .andThen(() =>
      ResultAsync.fromPromise(
        prepareApplication({
          jobPostingId: jobData.postingId,
          formId,
        }),
        (error) => new ContractError('prepare_application', error),
      ),
    )
    .andThen((preparation) => {
      if (preparation.kind === 'existing') {
        return resolveApplicationSubmissionResult(preparation, stakeAmount, () => step('submitting'));
      }

      const prepared = preparation;

      step('encrypting');

      return ResultAsync.fromPromise(
        prepareApplicationFinalization(prepared, {
          stakeAmount,
          jobData,
          formId,
          answerBuckets,
          fieldValues,
          candidateIdentityInputs,
          candidateProfileInput,
          aiCriteriaEvaluation,
          resumeUpload,
          fileUploads,
        }),
        (error) => new EncryptionError('encrypt_data', error),
      )
        .andThen((input) => {
          step('signing');

          return ResultAsync.fromPromise(finalizeApplication(prepared.applicationId, input), toSignatureError);
        })
        .map((disposition) => ({
          kind: 'prepared' as const,
          applicationId: prepared.applicationId,
          disposition,
        }))
        .andThen((submission) => resolveApplicationSubmissionResult(submission, stakeAmount, () => step('submitting')));
    });
}
