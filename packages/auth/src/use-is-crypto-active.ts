import { CryptoProxy } from '@comitium/crypto';
import { useSyncExternalStore } from 'react';

/**
 * SSR snapshot: server has no session keys, so the vault is always "locked" on the server.
 * Client re-reads the real state from CryptoProxy on hydration.
 */
const getServerSnapshot = (): boolean => false;

export function useIsCryptoActive(): boolean {
  return useSyncExternalStore(CryptoProxy.subscribe, CryptoProxy.isActive, getServerSnapshot);
}
