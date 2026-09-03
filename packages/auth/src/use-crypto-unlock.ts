import { createContext, useContext } from 'react';

export interface CryptoUnlockContextValue {
  isCryptoActive: boolean;
  canUnlock: boolean;
  ensureUnlocked: () => Promise<void>;
  requestUnlock: () => Promise<void>;
}

export const CryptoUnlockContext = createContext<CryptoUnlockContextValue | null>(null);

export function useCryptoUnlock(): CryptoUnlockContextValue {
  const context = useContext(CryptoUnlockContext);

  if (!context) {
    throw new Error('useCryptoUnlock must be used within CryptoUnlockProvider');
  }

  return context;
}
