import { LS_LAST_ORG_ID } from '@comitium/auth/storage';
import { usePrivy } from '@privy-io/react-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { performCryptoReset } from '@/lib/crypto/crypto-reset';
import { getErrorMessage } from '@/lib/utils';

interface LogoutOptions {
  returnTo?: string;
}

export function useLogout() {
  const { logout } = usePrivy();
  const queryClient = useQueryClient();

  return useCallback(
    async ({ returnTo = '/' }: LogoutOptions = {}): Promise<boolean> => {
      try {
        await performCryptoReset({
          returnTo,
          logout,
          clearClientState: () => {
            queryClient.clear();
            globalThis.localStorage?.removeItem(LS_LAST_ORG_ID);
          },
          onDatabaseBlocked: () => {
            toast.warning('Close other Comitium tabs to finish signing out');
          },
        });

        return true;
      } catch (error) {
        toast.error('Logout failed', {
          description: `${getErrorMessage(error)} Try again to finish signing out.`,
        });

        return false;
      }
    },
    [logout, queryClient],
  );
}
