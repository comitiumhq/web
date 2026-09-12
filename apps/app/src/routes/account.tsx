import { createAuthAccountApi } from '@comitium/auth/account-api';
import { AccountSettingsPage } from '@comitium/auth/account-settings';
import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/components/auth/auth-guard';
import { qk } from '@/hooks/query-keys';
import { api } from '@/lib/api/client';

const accountApi = createAuthAccountApi(api);

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
      <AccountSettingsPage zkIdentityApi={accountApi} zkIdentityQueryKey={qk.account.zkIdentity} />
    </AuthGuard>
  );
}
