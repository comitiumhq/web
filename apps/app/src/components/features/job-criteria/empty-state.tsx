import { Button } from '@comitium/ui/button';
import { PlusIcon } from '@phosphor-icons/react';
import { EvaluationCriteriaIcon } from '@/lib/constants/domain-icons';

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center">
      <EvaluationCriteriaIcon className="size-8 mx-auto mb-3 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-heading-14">No criteria defined yet</p>
      <p className="text-copy-14 text-muted-foreground mt-1">
        Add criteria to evaluate candidates consistently across your team.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}>
        <PlusIcon data-icon="inline-start" />
        Add criterion
      </Button>
    </div>
  );
}
