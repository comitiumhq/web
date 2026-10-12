import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { Link } from '@tanstack/react-router';
import { FileXIcon } from 'lucide-react';

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
