import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { PageContainer } from '@comitium/ui/page-container';
import { PageLoader } from '@comitium/ui/page-loader';
import { KeyIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { useUser } from '@privy-io/react-auth';
import { useState } from 'react';

import { getLinkedSignInMethods } from '../linked-sign-in-methods';
import type { ZkIdentityApi } from '../zk-identity';
import { EmailSignInMethod } from './email-sign-in-method';
import { GoogleSignInMethod } from './google-sign-in-method';
import { PasskeySignInMethod } from './passkey-sign-in-method';
import { ZkIdentitySection } from './zk-identity-section';

type AccountSection = 'authentication' | 'zk-identity';

interface AccountSettingsPageProps {
  zkIdentityApi: ZkIdentityApi;
  zkIdentityQueryKey: (userId: string) => readonly unknown[];
}

export function AccountSettingsPage({ zkIdentityApi, zkIdentityQueryKey }: AccountSettingsPageProps) {
  const { refreshUser, user } = useUser();
  const [section, setSection] = useState<AccountSection>('authentication');

  if (!user) {
    return <PageLoader />;
  }

  const methods = getLinkedSignInMethods(user);

  return (
    <PageContainer size="settings" className="py-6 sm:px-4 lg:px-4">
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <AccountSidebar section={section} onSectionChange={setSection} />

        <main className="min-w-0">
          <div className="flex flex-col gap-6">
            <header>
              <h2 className="text-heading-24">{section === 'authentication' ? 'Authentication' : 'ZK Identity'}</h2>
            </header>

            {section === 'authentication' ? (
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
            ) : (
              <ZkIdentitySection key={user.id} api={zkIdentityApi} queryKey={zkIdentityQueryKey(user.id)} />
            )}
          </div>
        </main>
      </div>
    </PageContainer>
  );
}

function AccountSidebar({
  section,
  onSectionChange,
}: {
  section: AccountSection;
  onSectionChange: (section: AccountSection) => void;
}) {
  return (
    <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
      <h1 className="text-heading-20">Account</h1>

      <nav aria-label="Account" className="mt-7">
        <Button
          type="button"
          variant="ghost"
          aria-current={section === 'authentication' ? 'page' : undefined}
          onClick={() => onSectionChange('authentication')}
          className="h-9 w-full justify-start gap-3 rounded-xl px-3 text-label-14 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
        >
          <KeyIcon className="size-4 shrink-0" />
          <span>Authentication</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-current={section === 'zk-identity' ? 'page' : undefined}
          onClick={() => onSectionChange('zk-identity')}
          className="h-9 w-full justify-start gap-3 rounded-xl px-3 text-label-14 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
        >
          <ShieldCheckIcon className="size-4 shrink-0" />
          <span>ZK Identity</span>
        </Button>
      </nav>
    </aside>
  );
}
