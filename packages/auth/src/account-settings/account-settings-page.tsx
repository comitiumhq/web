import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { PageContainer } from '@comitium/ui/page-container';
import { PageLoader } from '@comitium/ui/page-loader';
import { KeyIcon } from '@phosphor-icons/react';
import { useUser } from '@privy-io/react-auth';

import { getLinkedSignInMethods } from '../linked-sign-in-methods';
import { EmailSignInMethod } from './email-sign-in-method';
import { GoogleSignInMethod } from './google-sign-in-method';
import { PasskeySignInMethod } from './passkey-sign-in-method';

export function AccountSettingsPage() {
  const { refreshUser, user } = useUser();

  if (!user) {
    return <PageLoader />;
  }

  const methods = getLinkedSignInMethods(user);

  return (
    <PageContainer size="settings" className="py-6 sm:py-10">
      <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10">
        <AccountSidebar />

        <main className="min-w-0">
          <div className="flex flex-col gap-6">
            <header>
              <h2 className="text-heading-24">Authentication</h2>
            </header>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Sign-in methods</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                <EmailSignInMethod email={methods.email} refreshUser={refreshUser} />
                <GoogleSignInMethod methods={methods} refreshUser={refreshUser} />
                <PasskeySignInMethod passkeyCount={methods.passkeys.length} refreshUser={refreshUser} />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </PageContainer>
  );
}

function AccountSidebar() {
  return (
    <aside className="min-w-0 md:sticky md:top-6 md:self-start">
      <h1 className="text-heading-20">Account</h1>

      <nav aria-label="Account" className="mt-4">
        <div
          aria-current="page"
          className="flex h-9 items-center gap-3 rounded-xl bg-accent px-3 text-label-14 text-accent-foreground"
        >
          <KeyIcon className="size-4 shrink-0" />
          <span>Authentication</span>
        </div>
      </nav>
    </aside>
  );
}
