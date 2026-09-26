import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { FileXIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

export function DraftNotFound({ orgId }: { orgId: string }) {
  return (
    <EmptyState icon={FileXIcon} title="Draft not found" description="This draft may have been deleted or published.">
      <Link to="/org/$orgId/jobs" params={{ orgId }} search={{ status: 'all' }} className="mt-4">
        <Button variant="outline" size="sm">
          Back to jobs
        </Button>
      </Link>
    </EmptyState>
  );
}
