import { useSession } from '@comitium/auth/use-session';

import { PublicUserMenu } from './public-user-menu';

export function CandidateAccountControls() {
  const { isSignedIn, user } = useSession();

  return <PublicUserMenu isSignedIn={isSignedIn} user={user} />;
}
