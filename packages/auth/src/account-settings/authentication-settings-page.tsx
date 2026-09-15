import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { PageHeader } from '@comitium/ui/page-header';
import { PageLoader } from '@comitium/ui/page-loader';
import { useUser } from '@privy-io/react-auth';

import { getLinkedSignInMethods } from '../linked-sign-in-methods';
import { EmailSignInMethod } from './email-sign-in-method';
import { GoogleSignInMethod } from './google-sign-in-method';
import { PasskeySignInMethod } from './passkey-sign-in-method';

export function AuthenticationSettingsPage() {
  const { refreshUser, user } = useUser();

  if (!user) {
    return <PageLoader />;
  }

  const methods = getLinkedSignInMethods(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Authentication" />
      <Card size="sm" className="gap-2">
        <CardHeader>
          <CardTitle>Sign-in methods</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-separator p-0">
          <EmailSignInMethod email={methods.email} refreshUser={refreshUser} />
          <GoogleSignInMethod methods={methods} refreshUser={refreshUser} />
          <PasskeySignInMethod passkeyCount={methods.passkeys.length} refreshUser={refreshUser} />
        </CardContent>
      </Card>
    </div>
  );
}
