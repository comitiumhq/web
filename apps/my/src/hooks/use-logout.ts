import { useAccountLogout } from '@comitium/auth/use-logout';

export function useLogout() {
  return useAccountLogout('/jobs');
}
