import type { ReactNode } from 'react';

import { WorkspaceHeader } from '@/components/header/workspace-header';
import { useEnsureCreatedOrgEncryption } from '@/hooks/queries/use-ensure-created-org-encryption';
import { useQueryMyOrgs } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrgCreation } from '@/hooks/queries/use-query-org-creation';
import { PendingVaultBootstrapProvider } from '@/hooks/use-vault-bootstrap';

import { getMaterializedCreatedOrganizationId } from './org-materialization';

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
  const organizationId = getMaterializedCreatedOrganizationId(creation, organizations ?? []);
  const bootstrap = useEnsureCreatedOrgEncryption(organizationId);

  return (
    <PendingVaultBootstrapProvider organizationId={bootstrap.isPending ? organizationId : null}>
      {children}
    </PendingVaultBootstrapProvider>
  );
}
