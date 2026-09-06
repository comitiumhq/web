import type { ReactNode } from 'react';
import { useQueryWorkspaceSetup } from '@/hooks/queries/use-query-workspace-setup';
import { usePermissions } from '@/hooks/use-permissions';
import { WorkspaceSetupCard } from './workspace-setup-card';

interface WorkspaceSetupShellProps {
  children: ReactNode;
  orgId: string;
}

export function WorkspaceSetupShell({ children, orgId }: WorkspaceSetupShellProps) {
  const { isAdmin } = usePermissions();
  const setupQuery = useQueryWorkspaceSetup(orgId, isAdmin);
  const setup = setupQuery.data;
  const showSetup = isAdmin && !setupQuery.isError && setup?.complete === false;

  return (
    <>
      <div className="h-full min-h-0">{children}</div>

      {showSetup && (
        <aside aria-label="Getting started" className="fixed bottom-4 left-4 z-40 w-fit max-w-[calc(100vw-2rem)]">
          <WorkspaceSetupCard key={orgId} orgId={orgId} setup={setup} />
        </aside>
      )}
    </>
  );
}
