import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { PageContainer } from '@comitium/ui/page-container';
import { SettingsNavLink } from '@comitium/ui/settings-nav-link';
import { BadgeCheckIcon, KeyRoundIcon, UserLockIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { useSession } from '../use-session';

interface AccountSettingsLayoutProps {
  children: ReactNode;
}

export function AccountSettingsLayout({ children }: AccountSettingsLayoutProps) {
  return (
    <PageContainer size="settings" className="h-full sm:px-4 lg:px-4">
      <div className="flex h-full min-h-0 gap-8 overflow-hidden">
        <aside className="hidden w-68 shrink-0 py-6 lg:block">
          <div className="sticky top-6">
            <p className="text-heading-20">Account</p>
            <AccountNavigation className="mt-7 flex-col" />
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col py-6">
          <AccountNavigation className="mb-6 lg:hidden" />
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">{children}</div>
        </main>
      </div>
    </PageContainer>
  );
}

interface AccountNavigationProps {
  className: string;
}

function AccountNavigation({ className }: AccountNavigationProps) {
  const { user } = useSession();

  return (
    <nav aria-label="Account" className={`flex flex-wrap gap-1 ${className}`}>
      <SettingsNavLink icon={UserLockIcon} label="Authentication" to="/account" />
      {hasEncryptionKeyBundle(user) ? (
        <SettingsNavLink icon={KeyRoundIcon} label="Recovery" to="/account/recovery" />
      ) : null}
      <SettingsNavLink icon={BadgeCheckIcon} label="ZK Identity" to="/account/zk-identity" />
    </nav>
  );
}
