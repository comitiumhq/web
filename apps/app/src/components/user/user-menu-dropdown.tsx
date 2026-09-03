import { Button } from '@comitium/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { ThemeMenuSub } from '@comitium/ui/theme-menu';
import { UserAccountSummary } from '@comitium/ui/user-account-summary';
import { UserAvatar } from '@comitium/ui/user-avatar';
import { GearIcon, SignOutIcon, UserCircleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { AccountContextSwitcher } from './account-context-switcher';
import type { ReadyUserMenuState } from './user-menu-state';

const menuItemClassName = 'h-10 gap-2 px-3 text-sm';

interface UserMenuDropdownProps {
  state: ReadyUserMenuState;
}

function LogoutMenuItem({ onDisconnect }: Pick<ReadyUserMenuState, 'onDisconnect'>) {
  return (
    <DropdownMenuItem className={menuItemClassName} variant="destructive" onClick={onDisconnect}>
      <SignOutIcon className="size-4" />
      Logout
    </DropdownMenuItem>
  );
}

export function UserMenuDropdown({ state }: UserMenuDropdownProps) {
  const hasSwitchableContexts = state.orgs.length > 0;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shrink-0 p-0 overflow-hidden"
          aria-label="Open account menu"
        >
          <UserAvatar identity={state.identity} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {hasSwitchableContexts ? (
          <AccountContextSwitcher
            currentOrgId={state.currentOrgId}
            identity={state.identity}
            onSelectOrg={state.onSelectOrg}
            orgs={state.orgs}
          />
        ) : (
          <UserAccountSummary identity={state.identity} className="px-3 py-2.5" />
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className={menuItemClassName}>
          <Link to="/account">
            <UserCircleIcon className="size-4 text-muted-foreground" />
            Account
          </Link>
        </DropdownMenuItem>

        {state.currentOrgId ? (
          <DropdownMenuItem asChild className={menuItemClassName}>
            <Link to="/org/$orgId/settings" params={{ orgId: state.currentOrgId }}>
              <GearIcon className="size-4 text-muted-foreground" />
              Settings
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <ThemeMenuSub />

        <DropdownMenuSeparator />

        <LogoutMenuItem onDisconnect={state.onDisconnect} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
