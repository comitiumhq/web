import { AccountSettingsLayout } from '@comitium/auth/account-settings-layout';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuthGuard } from '@/components/auth/auth-guard';

export const Route = createFileRoute('/account')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Account | Comitium' },
      { name: 'description', content: 'Manage your personal Comitium account.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: AccountRoute,
});

function AccountRoute() {
  return (
    <AuthGuard>
      <AccountSettingsLayout>
        <Outlet />
      </AccountSettingsLayout>
    </AuthGuard>
  );
}
