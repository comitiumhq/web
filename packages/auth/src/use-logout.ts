import { CryptoProxy } from '@comitium/crypto';
import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { publishSessionEvent } from './session-events';
import { LS_LAST_ORG_ID } from './storage';
import { useSession } from './use-session';

interface LogoutOptions {
  returnTo?: string;
  allDevices?: boolean;
}

let pendingLogout: Promise<boolean> | null = null;

export function useAccountLogout(defaultReturnTo: string) {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useCallback(
    ({ returnTo = defaultReturnTo, allDevices = false }: LogoutOptions = {}): Promise<boolean> => {
      if (pendingLogout) {
        return pendingLogout;
      }

      async function performLogout(): Promise<boolean> {
        if (user) {
          publishSessionEvent('logout-start', user.id);
        }

        try {
          const identity = hasEncryptionKeyBundle(user)
            ? { userId: user.id, wrapped: user.encryptedUserKey, publicKey: user.publicKey }
            : undefined;

          await CryptoProxy.logout(allDevices, identity);

          if (user) {
            publishSessionEvent('logout-complete', user.id);
          }

          window.location.replace(returnTo);
          return true;
        } catch {
          toast.error('Could not complete sign out. Please try again.');
          return false;
        } finally {
          queryClient.clear();

          try {
            localStorage.removeItem(LS_LAST_ORG_ID);
          } catch {}
        }
      }

      pendingLogout = performLogout().finally(() => {
        pendingLogout = null;
      });

      return pendingLogout;
    },
    [defaultReturnTo, queryClient, user],
  );
}
