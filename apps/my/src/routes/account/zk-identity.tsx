import { createAuthAccountApi } from '@comitium/auth/account-api';
import { createFileRoute } from '@tanstack/react-router';
import { ZkIdentitySettingsPage } from '@comitium/auth/zk-identity-settings-page';
import { qk } from '@/hooks/query-keys';
import { api } from '@/lib/api/client';

const accountApi = createAuthAccountApi(api);

export const Route = createFileRoute('/account/zk-identity')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'ZK Identity | Comitium' },
      { name: 'description', content: 'Manage your private identity verification.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: ZkIdentityRoute,
});

function ZkIdentityRoute() {
  return <ZkIdentitySettingsPage api={accountApi} queryKey={qk.account.zkIdentity} />;
}
