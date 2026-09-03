import { isAccountLoading, isAccountSettled } from './account-stage';
import { useAccountReadiness } from './use-account-readiness';

export function useSession() {
  const { stage, user } = useAccountReadiness();

  return {
    user,
    isSignedIn: user !== null,
    isSessionReady: isAccountSettled(stage),
    isSessionLoading: isAccountLoading(stage),
    needsSessionRecovery: stage === 'unrecoverable',
  };
}
