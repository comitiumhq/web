import { useSession } from './use-session';

export function useIsAuthenticated(): boolean {
  return useSession().isSignedIn;
}
