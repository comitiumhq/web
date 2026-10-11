import { isApiError } from '@comitium/schemas/api-errors';
import { getErrorMessage } from '@comitium/schemas/error';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import {
  ApplicationRequestError,
  type ApplicationResult,
  EncryptionError,
  type JobError,
} from '@comitium/schemas/product-errors';
import { ResultAsync } from 'neverthrow';
import { finalizeApplication, prepareApplication } from '@/lib/api/applications';
import {
  type ApplicationIntakeParams,
  type ApplicationIntakeStep,
  prepareApplicationFinalization,
} from './application-intake';
export type WorkflowStep = ApplicationIntakeStep;
export interface ApplyJobWorkflowParams extends Omit<ApplicationIntakeParams, 'orgId'> {
  jobData: JobApplicationData;
  onStep?: (step: WorkflowStep) => void;
}

function toApplicationRequestError(error: unknown): ApplicationRequestError {
  if (isApiError(error)) return new ApplicationRequestError(error.status, error.message, error.code);

  return new ApplicationRequestError(0, getErrorMessage(error));
}

export function applyJobWorkflow(params: ApplyJobWorkflowParams): ResultAsync<ApplicationResult, JobError> {
  const {
    jobData,
    formId,
    answerBuckets,
    candidateIdentityInputs,
    candidateProfileInput,
    aiCriteriaEvaluation,
    resumeUpload,
    fileUploads,
    onStep,
  } = params;

  return ResultAsync.fromPromise(
    prepareApplication({ jobPostingId: jobData.postingId, skillsRevision: jobData.skillsRevision, formId }),
    toApplicationRequestError,
  ).andThen((preparation) => {
    if (preparation.kind === 'existing')
      return ResultAsync.fromSafePromise(Promise.resolve({ kind: 'completed' as const }));

    onStep?.('encrypting');

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
      .andThen((input) => {
        onStep?.('submitting');

        return ResultAsync.fromPromise(
          finalizeApplication(preparation.applicationId, input),
          toApplicationRequestError,
        );
      })
      .map(() => ({ kind: 'completed' as const }));
  });
}
