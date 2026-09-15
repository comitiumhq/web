import { createAuthAccountApi } from '@comitium/auth/account-api';
import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute } from '@tanstack/react-router';
import { createClientOnlyFn } from '@tanstack/react-start';
import { lazy, Suspense } from 'react';
import { qk } from '@/hooks/query-keys';
import { api } from '@/lib/api/client';

const accountApi = createAuthAccountApi(api);
const loadZkIdentitySettingsPage = createClientOnlyFn(() =>
  import('@comitium/auth/zk-identity-settings-page').then((module) => ({
    default: module.ZkIdentitySettingsPage,
  })),
);
const ZkIdentitySettingsPage = lazy(loadZkIdentitySettingsPage);

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
  return (
    <Suspense fallback={<PageLoader />}>
      <ZkIdentitySettingsPage api={accountApi} queryKey={qk.account.zkIdentity} />
    </Suspense>
  );
}
