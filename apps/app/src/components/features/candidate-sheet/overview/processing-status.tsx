import type { ApplicationProcessingStatus } from '@comitium/schemas/applications';

const STATUS_LABELS: Record<ApplicationProcessingStatus['status'], string> = {
  pending: 'Preparing application data',
  processing: 'Processing application',
  complete: 'Processing complete',
  retryable_failed: 'Application processing delayed',
  terminal_failed: 'Application processing unavailable',
};

interface ProcessingStatusProps {
  processing: ApplicationProcessingStatus;
}

export function ProcessingStatus({ processing }: ProcessingStatusProps) {
  if (processing.criteriaEvaluationMode === null) {
    return null;
  }

  if (processing.status !== 'complete') {
    return (
      <div className="rounded-lg bg-muted/50 px-3 py-3">
        <p className="text-label-14">{STATUS_LABELS[processing.status]}</p>
      </div>
    );
  }

  if (processing.criteriaEvaluationMode === 'disabled') {
    return (
      <div className="rounded-lg bg-muted/50 px-3 py-3">
        <p className="text-label-14">AI-assisted evaluation disabled</p>
        <p className="mt-1 text-copy-14 text-muted-foreground">
          Structured resume processing completed without job-criteria evaluation.
        </p>
      </div>
    );
  }

  if (processing.criteriaEvaluationMode === 'candidate_opt_out') {
    return (
      <div className="rounded-lg bg-muted/50 px-3 py-3">
        <p className="text-label-14">AI evaluation skipped</p>
        <p className="mt-1 text-copy-14 text-muted-foreground">
          The candidate opted out of AI-assisted evaluation. Review the application manually.
        </p>
      </div>
    );
  }

  return null;
}
