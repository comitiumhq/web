import { EmptyState } from '@comitium/ui/empty-state';
import { BuildingsIcon } from '@phosphor-icons/react';

export function OrganizationAccessUnavailable() {
  return (
    <EmptyState
      icon={BuildingsIcon}
      title="No active organization access"
      description="Ask an Organization Admin to reactivate your membership."
      className="min-h-[calc(100vh-3.5rem)]"
    />
  );
}
