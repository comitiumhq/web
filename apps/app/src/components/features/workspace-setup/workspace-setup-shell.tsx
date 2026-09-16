import type { ReactNode } from 'react';
import { useQueryWorkspaceSetup } from '@/hooks/queries/use-query-workspace-setup';
import { usePermissions, useQueryOrgMe } from '@/hooks/use-permissions';
import type { WorkspaceSetup } from '@/lib/schemas/org';
import { WorkspaceSetupCard } from './workspace-setup-card';

interface WorkspaceSetupShellProps {
  children: ReactNode;
  orgId: string;
}

export function WorkspaceSetupShell({ children, orgId }: WorkspaceSetupShellProps) {
  const { isAdmin } = usePermissions();
  const memberQuery = useQueryOrgMe(orgId);
  const setupQuery = useQueryWorkspaceSetup(orgId, isAdmin);
  const setupCard = getSetupCardState(isAdmin, memberQuery, setupQuery);

  return (
    <>
      <div className="h-full min-h-0">{children}</div>

      {setupCard && (
        <aside aria-label="Getting started" className="fixed bottom-4 left-4 z-40 w-fit max-w-[calc(100vw-2rem)]">
          <WorkspaceSetupCard
            key={orgId}
            orgId={orgId}
            profileComplete={setupCard.profileComplete}
            setup={setupCard.setup}
          />
        </aside>
      )}
    </>
  );
}

function getSetupCardState(
  isAdmin: boolean,
  memberQuery: ReturnType<typeof useQueryOrgMe>,
  setupQuery: ReturnType<typeof useQueryWorkspaceSetup>,
): { profileComplete: boolean; setup?: WorkspaceSetup } | null {
  if (memberQuery.isLoading || memberQuery.isError || !memberQuery.data) return null;
  if (isAdmin && setupQuery.isLoading) return null;

  const profileComplete = Boolean(memberQuery.data.name?.trim());
  const hasIncompleteOrgSetup = isAdmin && !setupQuery.isError && setupQuery.data?.complete === false;
  const setup = hasIncompleteOrgSetup ? setupQuery.data : undefined;

  if (profileComplete && !setup) return null;

  return { profileComplete, setup };
}
