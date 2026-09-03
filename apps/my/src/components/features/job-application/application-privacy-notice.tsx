import {
  COMITIUM_AI_ASSISTANCE_NOTICE,
  COMITIUM_RESUME_ENCRYPTION_NOTICE,
  COMITIUM_RESUME_PROCESSING_ACCESS_NOTICE,
} from '@comitium/jobs/constants';
import type { CareerJob } from '@comitium/jobs/schemas';
import { Checkbox } from '@comitium/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comitium/ui/dialog';
import { Label } from '@comitium/ui/label';
import { Separator } from '@comitium/ui/separator';
import { useCallback } from 'react';

type RecruitingPrivacyPolicy = CareerJob['recruitingPrivacy'];

interface ApplicationPrivacyNoticeProps {
  policy: RecruitingPrivacyPolicy;
  showResumeProcessing: boolean;
  showCriteriaEvaluation: boolean;
  criteriaEvaluationOptOut: boolean;
  onCriteriaEvaluationOptOutChange: (optOut: boolean) => void;
}

export function ApplicationPrivacyNotice({
  policy,
  showResumeProcessing,
  showCriteriaEvaluation,
  criteriaEvaluationOptOut,
  onCriteriaEvaluationOptOutChange,
}: ApplicationPrivacyNoticeProps) {
  return (
    <div className="mt-2 flex flex-col gap-2 px-1 text-label-12 text-muted-foreground">
      <p>Your application is encrypted and available to authorized hiring-team members.</p>

      {policy.controllerName && policy.privacyPolicyUrl && (
        <p>
          {policy.controllerName} processes your personal data as described in its{' '}
          <a
            href={policy.privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Privacy Notice
          </a>
          .
        </p>
      )}

      {showResumeProcessing && (
        <p>
          AI-assisted resume processing may be used.{' '}
          <ResumeProcessingDetails
            policy={policy}
            showCriteriaEvaluation={showCriteriaEvaluation}
            optOut={criteriaEvaluationOptOut}
            onOptOutChange={onCriteriaEvaluationOptOutChange}
          />
        </p>
      )}
    </div>
  );
}

function ResumeProcessingDetails({
  policy,
  showCriteriaEvaluation,
  optOut,
  onOptOutChange,
}: {
  policy: RecruitingPrivacyPolicy;
  showCriteriaEvaluation: boolean;
  optOut: boolean;
  onOptOutChange: (optOut: boolean) => void;
}) {
  const handleOptOutChange = useCallback(
    (checked: boolean | 'indeterminate') => onOptOutChange(checked === true),
    [onOptOutChange],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="font-medium text-foreground underline underline-offset-4">
          Learn more
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-heading-20">Resume processing and AI assistance</DialogTitle>
          <DialogDescription className="text-copy-14">
            How Comitium protects your resume before, during, and after processing.
          </DialogDescription>
        </DialogHeader>
        <ResumeProcessingDetailsContent policy={policy} showCriteriaEvaluation={showCriteriaEvaluation} />
        {showCriteriaEvaluation && (
          <Label className="cursor-pointer items-center gap-3 py-1 leading-snug">
            <Checkbox checked={optOut} onCheckedChange={handleOptOutChange} />
            <span className="text-copy-13 font-normal text-foreground">
              Do not use AI-assisted evaluation for my application
            </span>
          </Label>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProcessingNotice({ title, children }: { title: string; children: string }) {
  return (
    <div className="py-4">
      <p className="text-label-14 font-medium text-foreground">{title}</p>
      <p className="mt-1 text-copy-14 leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function ResumeProcessingDetailsContent({
  policy,
  showCriteriaEvaluation,
}: {
  policy: RecruitingPrivacyPolicy;
  showCriteriaEvaluation: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="px-1">
        <ProcessingNotice title="Encrypted before upload">{COMITIUM_RESUME_ENCRYPTION_NOTICE}</ProcessingNotice>
        <Separator />
        <ProcessingNotice title="One-time processing access">
          {COMITIUM_RESUME_PROCESSING_ACCESS_NOTICE}
        </ProcessingNotice>
        <Separator />
        <ProcessingNotice title="Human decision-making">{COMITIUM_AI_ASSISTANCE_NOTICE}</ProcessingNotice>
      </div>

      {showCriteriaEvaluation &&
        (policy.aiCriteriaEvaluation.additionalNotice || policy.aiCriteriaEvaluation.additionalNoticeUrl) && (
          <div className="flex flex-col gap-2 px-1 text-copy-14 text-muted-foreground">
            <p className="text-label-14 font-medium text-foreground">Organization notice</p>
            {policy.aiCriteriaEvaluation.additionalNotice && <p>{policy.aiCriteriaEvaluation.additionalNotice}</p>}
            {policy.aiCriteriaEvaluation.additionalNoticeUrl && (
              <a
                href={policy.aiCriteriaEvaluation.additionalNoticeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit text-label-14 font-medium text-foreground underline underline-offset-4"
              >
                Additional information from the hiring organization
              </a>
            )}
          </div>
        )}
    </div>
  );
}
