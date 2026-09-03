import type { WalletAccount } from '@comitium/auth/send-calls';
import type { FeeTier } from '@comitium/chain/job-economics';
import { wholeUsdToUsdcUnits } from '@comitium/chain/usdc';
import type { JobDraft, PublishDraftParams } from '@comitium/schemas/jobs';
import { type JobError, SignatureError, TransactionError, ValidationError } from '@comitium/schemas/product-errors';
import { errAsync, ResultAsync } from 'neverthrow';
import { isApiError } from '@/lib/api/client';
import { publishDraft } from '@/lib/api/jobs';
import {
  type PreparedOperationDisposition,
  type PreparedRelayedOperation,
  submitAndConfirmPreparedRelayedOperation,
} from '@/lib/onchain-operation-signatures';

export interface PublishDraftWorkflowParams {
  orgId: string;
  jobId: string;
  draft: JobDraft;
  expectedVersion: number;
  stakeUsd: number;
  feeTier: FeeTier;
  maxApplications?: number;
  account: WalletAccount;
  descriptionMarkdown: string;
}

export interface PublishDraftWorkflowResult {
  id: string;
  operationId: string;
  state: PreparedOperationDisposition['kind'];
}

function prepareDraftPublish(
  orgId: string,
  jobId: string,
  params: PublishDraftParams,
): ResultAsync<PreparedRelayedOperation, SignatureError> {
  return ResultAsync.fromPromise(publishDraft(orgId, jobId, params), (e) =>
    isApiError(e) ? new SignatureError(e.status, e.message) : new SignatureError(0, String(e)),
  );
}

function signPreparedOperation(
  orgId: string,
  prepared: PreparedRelayedOperation,
  account: WalletAccount,
): ResultAsync<PreparedOperationDisposition, TransactionError> {
  return ResultAsync.fromPromise(
    submitAndConfirmPreparedRelayedOperation(orgId, prepared, account),
    (e) => new TransactionError('sign_onchain_operation', e),
  );
}

export function publishDraftWorkflow(
  params: PublishDraftWorkflowParams,
): ResultAsync<PublishDraftWorkflowResult, JobError> {
  const { orgId, jobId, draft, expectedVersion, stakeUsd, feeTier, maxApplications, account, descriptionMarkdown } =
    params;

  if (!draft.title?.trim()) {
    return errAsync(new ValidationError('title', 'Title is required'));
  }

  if (!descriptionMarkdown?.trim()) {
    return errAsync(new ValidationError('description', 'Description is required'));
  }

  const stakeAmount = wholeUsdToUsdcUnits(stakeUsd);
  const publishParams: PublishDraftParams = {
    expectedVersion,
    stake: stakeAmount.toString(),
    feeTier,
    maxApplications,
    descriptionMarkdown,
  };

  return prepareDraftPublish(orgId, jobId, publishParams).andThen((prepared) =>
    signPreparedOperation(orgId, prepared, account).map((confirmation) => ({
      id: jobId,
      operationId: prepared.operationId,
      state: confirmation.kind,
    })),
  );
}
