import {
  submitPreparedUserWalletOnchainOperation,
  type UserWalletOperationSubmission,
} from '@comitium/auth/user-wallet-operation';
import { waitForOperationReceipt } from '@comitium/chain/onchain-operation-observer';
import { isApiError } from '@comitium/schemas/api-errors';
import type {
  ApplicationSubmitDisposition,
  CommittedFinalizeApplicationInput,
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
} from '@comitium/schemas/product-errors';
import { ResultAsync } from 'neverthrow';
import type { Address } from 'viem';
import { finalizeApplication, prepareApplication, retryApplicationOnchainOperation } from '@/lib/api/applications';
import { deriveApplicationId, generateApplicationSalt } from '@/lib/eip712';
import { validateApplicationData } from '../core/validation';
import {
  type ApplicationIntakeParams,
  type ApplicationIntakeStep,
  prepareApplicationFinalization,
} from './application-intake';

export type WorkflowStep = ApplicationIntakeStep | 'signing';

export interface ApplyJobWorkflowParams extends Omit<ApplicationIntakeParams, 'orgId'> {
  address: Address;
  jobData: Extract<JobApplicationData, { applyMode: 'committed' }>;
  stakeAmount: bigint;
  onStep?: (step: WorkflowStep) => void;
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
    if (!('operationId' in disposition)) {
      throw new Error('Expected an onchain application result');
    }

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
          step('signing');

          const applicationSalt = generateApplicationSalt();
          const input: CommittedFinalizeApplicationInput = {
            ...applicationData,
            applicationId: deriveApplicationId({
              chainId: jobData.chainId,
              commitmentContract: jobData.commitmentContract,
              jobId: jobData.jobId,
              jobUuid: jobData.id,
              applicationUuid: prepared.applicationId,
              salt: applicationSalt,
            }),
            applicationSalt,
            stake: stakeAmount.toString(),
          };

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
