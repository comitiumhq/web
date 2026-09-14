import { PageContainer } from '@comitium/ui/page-container';
import { SettingsNavLink } from '@comitium/ui/settings-nav-link';
import { KeyIcon, SealCheckIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export function AccountSettingsLayout({ children }: { children: ReactNode }) {
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

function AccountNavigation({ className }: { className: string }) {
  return (
    <nav aria-label="Account" className={`flex gap-1 ${className}`}>
      <SettingsNavLink icon={KeyIcon} label="Authentication" to="/account" />
      <SettingsNavLink icon={SealCheckIcon} label="ZK Identity" to="/account/zk-identity" />
    </nav>
  );
}
