import type { JobPosting } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';

interface ResponseCommitmentStatusProps {
  commitment: JobPosting['commitment'];
  isPostingPublished: boolean;
  canReleaseFunds: boolean;
  isReleasing: boolean;
  onRelease: () => void;
}

export function ResponseCommitmentStatus({
  commitment,
  isPostingPublished,
  canReleaseFunds,
  isReleasing,
  onRelease,
}: ResponseCommitmentStatusProps) {
  if (!commitment || commitment.status === 'closed') {
    return null;
  }

  if (isPostingPublished && !commitment.canSettle) {
    return null;
  }

  const statusLabel = getCommitmentStatusLabel(commitment.pendingApplicationResponses);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-separator px-4 py-3">
      <p className="text-copy-13 text-muted-foreground">{statusLabel}</p>
      {commitment.canSettle && canReleaseFunds && (
        <Button variant="outline" size="sm" onClick={onRelease} disabled={isReleasing}>
          {isReleasing ? 'Releasing...' : 'Release funds'}
        </Button>
      )}
    </div>
  );
}

function getCommitmentStatusLabel(pendingResponses: number): string {
  if (pendingResponses === 0) {
    return 'All applications have received a response.';
  }

  const applicationLabel = pendingResponses === 1 ? 'application still needs' : 'applications still need';

  return `${pendingResponses} ${applicationLabel} a response before funds can be released.`;
}
