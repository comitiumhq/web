import type { JobApplicationData } from '@comitium/schemas/jobs';
import { finalizeApplication, prepareApplication } from '@/lib/api/applications';
import {
  type ApplicationIntakeParams,
  type ApplicationIntakeStep,
  prepareApplicationFinalization,
} from './application-intake';

export interface ApplyStandardJobWorkflowParams extends Omit<ApplicationIntakeParams, 'orgId'> {
  jobData: Extract<JobApplicationData, { applyMode: 'standard' }>;
  onStep?: (step: ApplicationIntakeStep) => void;
}

export async function applyStandardJobWorkflow(params: ApplyStandardJobWorkflowParams): Promise<void> {
  const preparation = await prepareApplication({
    jobPostingId: params.jobData.postingId,
    formId: params.formId,
  });

  if (preparation.kind !== 'prepared') {
    throw new Error('This application has already been submitted');
  }

  params.onStep?.('encrypting');

  const input = await prepareApplicationFinalization(preparation, {
    orgId: params.jobData.orgId,
    formId: params.formId,
    answerBuckets: params.answerBuckets,
    candidateIdentityInputs: params.candidateIdentityInputs,
    candidateProfileInput: params.candidateProfileInput,
    aiCriteriaEvaluation: params.aiCriteriaEvaluation,
    resumeUpload: params.resumeUpload,
    fileUploads: params.fileUploads,
  });

  params.onStep?.('submitting');

  const result = await finalizeApplication(preparation.applicationId, input);

  if (result.state !== 'completed' || !('applicationId' in result)) {
    throw new Error('Application submission returned an unexpected result');
  }
}
