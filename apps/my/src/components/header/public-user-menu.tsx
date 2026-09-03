import { isAccountLoading } from '@comitium/auth/account-stage';
import { getPrivyAccountEmail } from '@comitium/auth/privy-account';
import { useAccountReadiness } from '@comitium/auth/use-account-readiness';
import { useCryptoResetListener } from '@comitium/auth/use-crypto-reset-listener';
import { useActiveWalletConnectionStatus } from '@comitium/auth/use-wallet';
import type { User } from '@comitium/schemas/auth';
import { Button } from '@comitium/ui/button';
import { createDisplayIdentity } from '@comitium/ui/display-name';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { Skeleton } from '@comitium/ui/skeleton';
import { ThemeMenuSub } from '@comitium/ui/theme-menu';
import { UserAccountSummary } from '@comitium/ui/user-account-summary';
import { UserAvatar } from '@comitium/ui/user-avatar';
import { SignOutIcon, UserCircleIcon } from '@phosphor-icons/react';
import { usePrivy } from '@privy-io/react-auth';
import { Link } from '@tanstack/react-router';
import { useCallback } from 'react';
import { AuthSessionRecovery } from '@/components/auth/auth-session-recovery';
import { useLogout } from '@/hooks/use-logout';
import { subscribeToCryptoReset } from '@/lib/crypto/crypto-reset';
import { LoginButton } from './login-button';

interface PublicUserMenuProps {
  isSignedIn: boolean;
  user: User | null;
}

const menuItemClassName = 'h-10 gap-2 px-3 text-sm';

export function PublicUserMenu(props: PublicUserMenuProps) {
  const { stage } = useAccountReadiness();
  useCryptoResetListener(subscribeToCryptoReset);

  if (!props.isSignedIn || !props.user) {
    if (isAccountLoading(stage)) {
      return <Skeleton className="h-8 w-20" />;
    }

    if (stage === 'unrecoverable') {
      return <AuthSessionRecovery fallback={<Skeleton className="h-8 w-20" />} />;
    }

    return <LoginButton />;
  }

  return <SignedInPublicUserMenu user={props.user} />;
}

function SignedInPublicUserMenu({ user }: { user: User }) {
  const { user: privyUser } = usePrivy();
  const logout = useLogout();
  const connectionStatus = useActiveWalletConnectionStatus();
  const accountEmail = getPrivyAccountEmail(privyUser);
  const identity = createDisplayIdentity({
    walletAddress: user.walletAddress,
    name: null,
    email: accountEmail,
  });

  const handleDisconnect = useCallback(async () => {
    await logout({ returnTo: '/jobs' });
  }, [logout]);

  const isWalletRestoring = connectionStatus === 'unknown' || connectionStatus === 'connecting';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shrink-0 p-0 overflow-hidden"
          aria-label="Open account menu"
        >
          <UserAvatar identity={identity} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <UserAccountSummary identity={identity} className="px-3 py-2.5" />

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className={menuItemClassName}>
          <Link to="/account">
            <UserCircleIcon className="size-4 text-muted-foreground" />
            Account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <ThemeMenuSub />

        <DropdownMenuItem
          className={menuItemClassName}
          variant="destructive"
          disabled={isWalletRestoring}
          onClick={handleDisconnect}
        >
          <SignOutIcon className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
