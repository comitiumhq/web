import { getPrivyAccountEmail } from '@comitium/auth/privy-account';
import { useAccountReadiness } from '@comitium/auth/use-account-readiness';
import { getErrorMessage } from '@comitium/schemas/error';
import { Button } from '@comitium/ui/button';
import { Spinner } from '@comitium/ui/spinner';
import { ClockIcon, LinkIcon, WarningCircleIcon, XCircleIcon } from '@phosphor-icons/react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { getPublicSiteOrigin } from '@/config/site';
import { useAcceptInvite } from '@/hooks/mutations/use-accept-invite';
import { useQueryInvite } from '@/hooks/queries/use-query-invite';
import { useLogout } from '@/hooks/use-logout';

import { ErrorMessage } from './error-message';
import { InviteCard, InviteLoadingCard, InviteStatusCard } from './invite-card';
import { resolveInvitePageState } from './invite-page-state';

interface InviteAcceptPageProps {
  token: string | null;
}

export function InviteAcceptPage({ token }: InviteAcceptPageProps) {
  const navigate = useNavigate();
  const { user: privyUser } = usePrivy();
  const { stage: accountStage } = useAccountReadiness();
  const logout = useLogout();
  const { data: invite, isLoading, error } = useQueryInvite(token);
  const { mutate: acceptInvite, isPending: isAccepting } = useAcceptInvite();
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const accountEmail = getPrivyAccountEmail(privyUser);
  const pageState = resolveInvitePageState({
    token,
    isLoading,
    hasError: Boolean(error),
    invite,
    accountStage,
  });

  const switchAccount = useCallback(async () => {
    if (isSwitchingAccount) {
      return;
    }

    setIsSwitchingAccount(true);
    setLogoutError(false);
    setAcceptError(null);

    const succeeded = await logout({ returnTo });

    if (!succeeded) {
      setLogoutError(true);
    }

    setIsSwitchingAccount(false);
  }, [isSwitchingAccount, logout, returnTo]);

  const handleSignIn = useCallback(() => {
    navigate({ to: '/login', search: { returnTo } });
  }, [navigate, returnTo]);

  const handleCreateAccount = useCallback(() => {
    navigate({ to: '/signup', search: { returnTo } });
  }, [navigate, returnTo]);

  const submitInvite = useCallback(() => {
    if (!token) {
      return;
    }

    setAcceptError(null);

    acceptInvite(token, {
      onSuccess: (data) => {
        navigate({ to: '/org/$orgId', params: { orgId: data.orgId } });
      },
      onError: (error: Error) => {
        setAcceptError(getErrorMessage(error, 'Could not accept the invitation'));
      },
    });
  }, [acceptInvite, navigate, token]);

  const handleGoJobs = useCallback(() => {
    window.location.assign(getPublicSiteOrigin());
  }, []);

  if (pageState === 'invalid') {
    return (
      <InviteStatusCard
        icon={LinkIcon}
        title="Invalid invite link"
        description="Open the invite link from your email, or ask the workspace admin to send a new invitation."
      >
        <Button variant="outline" size="lg" className="w-full" onClick={handleGoJobs}>
          Go to job board
        </Button>
      </InviteStatusCard>
    );
  }

  if (pageState === 'loading') {
    return <InviteLoadingCard />;
  }

  if (pageState === 'not_found' || !invite) {
    return (
      <InviteStatusCard
        icon={WarningCircleIcon}
        title="Invite not found"
        description="This invitation link is invalid or no longer available. Ask the sender to resend it."
      >
        <Button variant="outline" size="lg" className="w-full" onClick={handleGoJobs}>
          Go to job board
        </Button>
      </InviteStatusCard>
    );
  }

  if (pageState === 'revoked') {
    return (
      <InviteStatusCard
        icon={XCircleIcon}
        title="Invitation revoked"
        description="This invitation was revoked by the workspace admin. Ask for a new invite if you still need access."
      />
    );
  }

  if (pageState === 'expired') {
    return (
      <InviteStatusCard
        icon={ClockIcon}
        title="Invitation expired"
        description="This invitation has expired. Ask the workspace admin to send a new one."
      />
    );
  }

  if (pageState === 'account_recovery') {
    return (
      <InviteCard invite={invite} title="We couldn't continue" description="Sign in again to join this workspace.">
        <ErrorMessage message={logoutError ? "We couldn't finish signing out. Try again." : null} />
        <Button size="lg" className="mt-3 w-full font-semibold" onClick={switchAccount} disabled={isSwitchingAccount}>
          {isSwitchingAccount && <Spinner data-icon="inline-start" />}
          Sign in again
        </Button>
      </InviteCard>
    );
  }

  if (pageState === 'login') {
    return (
      <InviteCard
        invite={invite}
        title={invite.isAccepted ? 'Invitation already used' : 'Join this workspace'}
        description={
          invite.isAccepted
            ? 'Sign in with the same Comitium account to continue to the workspace.'
            : 'Sign in or create your Comitium account to join this workspace.'
        }
      >
        <div className="grid gap-3">
          <Button size="lg" className="w-full font-semibold" onClick={handleSignIn}>
            Sign in
          </Button>
          {!invite.isAccepted ? (
            <Button variant="outline" size="lg" className="w-full font-semibold" onClick={handleCreateAccount}>
              Create account
            </Button>
          ) : null}
        </div>
      </InviteCard>
    );
  }

  if (pageState === 'preparing') {
    return (
      <InviteCard invite={invite} title="Preparing your account" description="This should only take a moment.">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/30 p-4">
          <Spinner className="text-muted-foreground" />
          <span className="text-copy-13 text-muted-foreground">Please wait...</span>
        </div>
      </InviteCard>
    );
  }

  let submitLabel = 'Join workspace';

  if (isAccepting) {
    submitLabel = 'Joining...';
  } else if (invite.isAccepted) {
    submitLabel = 'Continue to workspace';
  }

  return (
    <InviteCard
      invite={invite}
      title={invite.isAccepted ? 'Invitation already used' : 'Join this workspace'}
      description={
        invite.isAccepted
          ? 'This invitation has already been used. You can continue if this account still has access to the workspace.'
          : 'The account below will join this workspace.'
      }
    >
      <div className="grid gap-4">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-copy-12 text-muted-foreground">Signed in as</p>
          <p className="mt-1 truncate text-copy-14 font-medium">{accountEmail ?? 'Your Comitium account'}</p>
        </div>

        <ErrorMessage message={acceptError ?? (logoutError ? "We couldn't switch accounts. Try again." : null)} />

        <Button size="lg" className="w-full font-semibold" onClick={submitInvite} disabled={isAccepting}>
          {isAccepting && <Spinner data-icon="inline-start" />}
          {submitLabel}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={switchAccount}
          disabled={isAccepting || isSwitchingAccount}
        >
          {isSwitchingAccount && <Spinner data-icon="inline-start" />}
          Use another account
        </Button>
      </div>
    </InviteCard>
  );
}
