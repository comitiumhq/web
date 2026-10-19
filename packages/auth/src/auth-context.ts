import { createContext, useContext } from 'react';
import type { IdentityClient } from './auth-client';

export const AuthClientContext = createContext<IdentityClient | null>(null);

export function useAuthClient(): IdentityClient {
  const client = useContext(AuthClientContext);

  if (!client) {
    throw new Error('useAuthClient must be used within AuthProvider');
  }

  return client;
}
