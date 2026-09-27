import {
  submitPreparedUserWalletOnchainOperation,
  type UserWalletOperationSubmission,
} from '@comitium/auth/user-wallet-operation';
import { waitForOperationReceipt } from '@comitium/chain/onchain-operation-observer';
import { isApiError } from '@comitium/schemas/api-errors';
import type {
  ApplicationPrepare,
  ApplicationSubmitDisposition,
  FinalizeApplicationInput,
  ResponseCommitmentFinalizeApplicationInput,
  UserWalletApplicationRequest,
} from '@comitium/schemas/applications';
import { getErrorMessage } from '@comitium/schemas/error';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import {
  type ApplicationResult,
  ContractError,
  EncryptionError,
  type JobError,
  SignatureError,
  TransactionError,
  ValidationError,
} from '@comitium/schemas/product-errors';
import { ResultAsync } from 'neverthrow';
import { finalizeApplication, prepareApplication, retryApplicationOnchainOperation } from '@/lib/api/applications';
import { deriveApplicationId, generateApplicationSalt } from '@/lib/eip712';
import {
  type ApplicationIntakeParams,
  type ApplicationIntakeStep,
  prepareApplicationFinalization,
} from './application-intake';

export type WorkflowStep = ApplicationIntakeStep | 'signing';

export interface ApplyJobWorkflowParams extends Omit<ApplicationIntakeParams, 'orgId'> {
  jobData: JobApplicationData;
  walletReady: boolean;
  onStep?: (step: WorkflowStep) => void;
}

interface ApplicationSubmission {
  kind: 'prepared' | 'existing';
  applicationId: string;
  disposition: ApplicationSubmitDisposition;
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
    return { kind: 'completed' };
  }

  if (disposition.state === 'confirming') {
    const receipt = await waitForOperationReceipt(disposition.operationId);

    return { kind: receipt.kind, operationId: disposition.operationId };
  }

  if (disposition.state !== 'wallet_confirmation') {
    throw new Error('This application is no longer ready. Refresh the page and try again.');
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
  onSubmission: () => void,
): Promise<ApplicationResult> {
  let disposition = submission.disposition;

  if (submission.kind === 'existing' && disposition.state === 'try_again') {
    disposition = await retryApplicationOnchainOperation(submission.applicationId, disposition.operationId);
  }

  if (disposition.state === 'wallet_confirmation') {
    onSubmission();
  }

  return resolveDisposition(disposition);
}

function resolveApplicationSubmissionResult(
  submission: ApplicationSubmission,
  onSubmission: () => void,
): ResultAsync<ApplicationResult, JobError> {
  return ResultAsync.fromPromise(resolveApplicationSubmission(submission, onSubmission), (error) => {
    if (error instanceof TransactionError || error instanceof ContractError) {
      return error;
    }

    return toSignatureError(error);
  });
}

function responseCommitmentFinalizationInput(
  prepared: ApplicationPrepare,
  applicationData: FinalizeApplicationInput,
): ResponseCommitmentFinalizeApplicationInput {
  const commitment = prepared.commitment;

  if (commitment === null) {
    throw new Error('Expected response commitment');
  }

  const applicationSalt = generateApplicationSalt();

  return {
    ...applicationData,
    applicationId: deriveApplicationId({
      chainId: commitment.chainId,
      responseCommitmentContract: commitment.contract,
      commitmentId: commitment.commitmentId,
      jobUuid: commitment.jobUuid,
      applicationUuid: prepared.applicationId,
      salt: applicationSalt,
    }),
    applicationSalt,
  };
}

export function applyJobWorkflow(params: ApplyJobWorkflowParams): ResultAsync<ApplicationResult, JobError> {
  const {
    jobData,
    walletReady,
    formId,
    answerBuckets,
    candidateIdentityInputs,
    candidateProfileInput,
    aiCriteriaEvaluation,
    resumeUpload,
    fileUploads,
    onStep,
  } = params;
  const step = (value: WorkflowStep) => onStep?.(value);

  return ResultAsync.fromPromise(
    prepareApplication({
      jobPostingId: jobData.postingId,
      formId,
    }),
    toSignatureError,
  ).andThen((preparation) => {
    if (preparation.kind === 'existing') {
      return resolveApplicationSubmissionResult(preparation, () => step('submitting'));
    }

    if (preparation.commitment !== null && !walletReady) {
      return ResultAsync.fromPromise(
        Promise.reject(
          new ValidationError('eligibility', 'This application is not ready. Refresh the page and try again.'),
        ),
        (error) => error as ValidationError,
      );
    }

    step('encrypting');

    return ResultAsync.fromPromise(
      prepareApplicationFinalization(preparation, {
        orgId: jobData.orgId,
        formId,
        answerBuckets,
        candidateIdentityInputs,
        candidateProfileInput,
        aiCriteriaEvaluation,
        resumeUpload,
        fileUploads,
      }),
      (error) => new EncryptionError('encrypt_data', error),
    )
      .andThen((applicationData) => {
        const input =
          preparation.commitment === null
            ? applicationData
            : responseCommitmentFinalizationInput(preparation, applicationData);

        step(preparation.commitment === null ? 'submitting' : 'signing');

        return ResultAsync.fromPromise(finalizeApplication(preparation.applicationId, input), toSignatureError);
      })
      .map((disposition) => ({
        kind: 'prepared' as const,
        applicationId: preparation.applicationId,
        disposition,
      }))
      .andThen((submission) => resolveApplicationSubmissionResult(submission, () => step('submitting')));
  });
}
