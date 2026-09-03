import { AuthSessionRecovery } from '@/components/auth/auth-session-recovery';

import { ConnectWalletButton } from '../auth/connect-wallet-button';
import { UserMenuDropdown } from './user-menu-dropdown';
import { useUserMenuState } from './user-menu-state';

export const UserMenu = () => {
  const state = useUserMenuState();

  if (state.status === 'hidden') {
    return null;
  }

  if (state.status === 'connect') {
    return <ConnectWalletButton />;
  }

  if (state.status === 'recover') {
    return <AuthSessionRecovery fallback={null} />;
  }

  return <UserMenuDropdown state={state} />;
};
