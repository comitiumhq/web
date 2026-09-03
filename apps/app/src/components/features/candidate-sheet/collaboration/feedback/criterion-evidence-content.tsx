import { Skeleton } from '@comitium/ui/skeleton';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';

import type { CriterionEvidenceState } from './use-criterion-evidence';

interface CriterionEvidenceContentProps {
  evidenceState: CriterionEvidenceState;
  orgId: string;
}

export function CriterionEvidenceContent({ evidenceState, orgId }: CriterionEvidenceContentProps) {
  const { isUnlocked } = useEncryptionUnlocked(orgId);

  if (!isUnlocked) {
    return (
      <div className="border-t border-border bg-muted/30 px-4 py-3">
        <EncryptedPlaceholder orgId={orgId} variant="block" withBorder={false} lines={2} />
      </div>
    );
  }

  if (evidenceState.status === 'idle' || evidenceState.status === 'loading') {
    return <CriterionEvidenceSkeleton />;
  }

  if (evidenceState.status === 'error') {
    return (
      <p className="border-t border-border bg-muted/30 px-4 py-3 text-label-12 text-destructive">
        Evidence could not be decrypted.
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3">
      <p className="text-label-12 leading-relaxed text-foreground">{evidenceState.evidence.rationale}</p>
      {evidenceState.evidence.citations.length > 0 && (
        <ul className="space-y-2">
          {evidenceState.evidence.citations.map((citation) => (
            <li key={citation.excerpt} className="border-l-2 border-border pl-2.5">
              <p className="text-label-12 leading-relaxed text-muted-foreground">“{citation.excerpt}”</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CriterionEvidenceSkeleton() {
  return (
    <div className="space-y-2 border-t border-border bg-muted/30 px-4 py-3">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="mt-3 h-8 w-full" />
    </div>
  );
}
