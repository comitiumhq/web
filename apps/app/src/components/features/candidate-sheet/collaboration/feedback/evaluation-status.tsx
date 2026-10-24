import type { ApplicationProcessingStatus } from '@comitium/schemas/applications';

interface EvaluationStatusProps {
  processing: ApplicationProcessingStatus;
}

export function EvaluationStatus({ processing }: EvaluationStatusProps) {
  if (processing.criteriaEvaluationMode === null) {
    return null;
  }

  if (processing.status !== 'complete') {
    return null;
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
