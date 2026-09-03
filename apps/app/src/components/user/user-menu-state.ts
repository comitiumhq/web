import { isAccountLoading } from '@comitium/auth/account-stage';
import { getPrivyAccountEmail } from '@comitium/auth/privy-account';
import { useAccountReadiness } from '@comitium/auth/use-account-readiness';
import { useAccount } from '@comitium/auth/use-wallet';
import { isUnauthorizedError } from '@comitium/schemas/api-query-policy';
import type { DisplayIdentity } from '@comitium/schemas/common';
import { createDisplayIdentity } from '@comitium/ui/display-name';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate, useParams, useRouterState } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useAccountSession } from '@/hooks/queries/use-account-session';
import { useQueryMyOrgs } from '@/hooks/queries/use-query-my-orgs';
import { useLogout } from '@/hooks/use-logout';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import type { MyOrg } from '@/lib/schemas/org';
import { getPreferredOrg } from '@/lib/utils/org';

import { getOrgContextId, getOrgSwitchPath } from './account-context-switcher';

interface HiddenUserMenuState {
  status: 'hidden';
}

interface ConnectUserMenuState {
  status: 'connect';
}

interface RecoverUserMenuState {
  status: 'recover';
}

export interface ReadyUserMenuState {
  currentOrgId: string | null;
  identity: DisplayIdentity | null;
  onDisconnect: () => Promise<void>;
  onSelectOrg: (id: string) => void;
  orgs: MyOrg[];
  status: 'ready';
}

export type UserMenuState = ConnectUserMenuState | HiddenUserMenuState | ReadyUserMenuState | RecoverUserMenuState;

export function useUserMenuState(): UserMenuState {
  const { user: privyUser } = usePrivy();
  const { address } = useAccount();
  const logout = useLogout();
  const { stage } = useAccountReadiness();
  const { location } = useRouterState();
  const params = useParams({ strict: false }) as { orgId?: string };
  const navigate = useNavigate();
  const routeOrgId = params.orgId ?? null;
  const routeContextOrgId = getOrgContextId(location.pathname, routeOrgId);
  const { data: myOrgs, error: myOrgsError } = useQueryMyOrgs();
  const accountSession = useAccountSession();
  const orgs = myOrgs ?? accountSession.orgs;
  const preferredAccountOrg = location.pathname.startsWith('/account') ? getPreferredOrg(orgs) : null;
  const currentOrgId = routeContextOrgId ?? preferredAccountOrg?.id ?? null;
  const hasSwitchableContexts = orgs.length > 0;
  const currentOrg = currentOrgId ? orgs.find((org) => org.id === currentOrgId) : null;
  const { data: orgMe } = useQueryOrgMe(currentOrg?.id);
  const publicOrgMember = currentOrgId && accountSession.org?.id === currentOrgId ? accountSession.orgMember : null;
  const isPreparingAccount = isAccountLoading(stage);
  const profileName = currentOrgId ? (orgMe?.name ?? publicOrgMember?.name ?? null) : null;
  const walletAddress = address ?? accountSession.user?.walletAddress ?? null;
  const accountEmail = getPrivyAccountEmail(privyUser);
  const identity = createDisplayIdentity({
    walletAddress,
    name: profileName ?? publicOrgMember?.name ?? null,
    email: accountEmail,
  });

  const handleSelectOrg = useCallback(
    (id: string) => {
      const nextOrgPath = getOrgSwitchPath(location.pathname, currentOrgId, id);

      navigate({ to: nextOrgPath as string });
    },
    [currentOrgId, location.pathname, navigate],
  );

  const handleDisconnect = useCallback(async () => {
    await logout({ returnTo: '/' });
  }, [logout]);

  if (isPreparingAccount && !hasSwitchableContexts) {
    return { status: 'hidden' };
  }

  if (stage === 'unrecoverable') {
    return { status: 'recover' };
  }

  if (stage !== 'ready') {
    return { status: 'connect' };
  }

  if (!currentOrgId && isUnauthorizedError(myOrgsError)) {
    return { status: 'recover' };
  }

  return {
    currentOrgId,
    identity,
    onDisconnect: handleDisconnect,
    onSelectOrg: handleSelectOrg,
    orgs,
    status: 'ready',
  };
}
