import type { ReactNode } from 'react';

import { WorkspaceHeader } from '@/components/header/workspace-header';
import { useEnsureCreatedOrgEncryption } from '@/hooks/queries/use-ensure-created-org-encryption';
import { useQueryMyOrgs } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrgCreation } from '@/hooks/queries/use-query-org-creation';
import { getAccessibleCreatedOrganizationId } from '@/lib/schemas/org';

interface AuthenticatedAppShellProps {
  children: ReactNode;
}

export function AuthenticatedAppShell({ children }: AuthenticatedAppShellProps) {
  return (
    <CreatedOrgEncryptionBootstrap>
      <WorkspaceHeader />
      {children}
    </CreatedOrgEncryptionBootstrap>
  );
}

function CreatedOrgEncryptionBootstrap({ children }: { children: ReactNode }) {
  const { data: creation } = useQueryOrgCreation();
  const { data: organizations } = useQueryMyOrgs();
  const createdOrganizationId = getAccessibleCreatedOrganizationId(creation);
  const organizationId = organizations?.some(({ id }) => id === createdOrganizationId) ? createdOrganizationId : null;

  useEnsureCreatedOrgEncryption(organizationId);

  return children;
}
