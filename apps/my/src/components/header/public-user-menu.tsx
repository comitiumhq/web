import { isAccountLoading } from '@comitium/auth/account-stage';
import { useAuthClient } from '@comitium/auth/auth-context';
import { useAccountReadiness } from '@comitium/auth/use-account-readiness';
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
import { Link } from '@tanstack/react-router';
import { CircleUserRoundIcon, LogOutIcon } from 'lucide-react';
import { useCallback } from 'react';
import { useLogout } from '@/hooks/use-logout';
import { LoginButton } from './login-button';

interface PublicUserMenuProps {
  isSignedIn: boolean;
  user: User | null;
}

const menuItemClassName = 'h-10 gap-2 px-3 text-sm';

export function PublicUserMenu(props: PublicUserMenuProps) {
  const { stage } = useAccountReadiness();

  if (!props.isSignedIn || !props.user) {
    if (isAccountLoading(stage)) {
      return <Skeleton className="h-8 w-20" />;
    }

    return <LoginButton />;
  }

  return <SignedInPublicUserMenu />;
}

function SignedInPublicUserMenu() {
  const { data: auth } = useAuthClient().useSession();
  const logout = useLogout();
  const accountEmail = auth?.user.email ?? null;
  const identity = createDisplayIdentity({
    name: null,
    email: accountEmail,
  });

  const handleDisconnect = useCallback(async () => {
    await logout({ returnTo: '/jobs' });
  }, [logout]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="shrink-0 overflow-hidden rounded-full p-0"
          aria-label="Open account menu"
        >
          <UserAvatar identity={identity} className="size-9 text-sm" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <UserAccountSummary identity={identity} className="px-3 py-2.5" />

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className={menuItemClassName}>
          <Link to="/account">
            <CircleUserRoundIcon className="size-4 text-muted-foreground" />
            Account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <ThemeMenuSub />

        <DropdownMenuItem className={menuItemClassName} variant="destructive" onClick={handleDisconnect}>
          <LogOutIcon className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
