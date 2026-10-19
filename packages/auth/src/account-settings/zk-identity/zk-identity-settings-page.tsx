import { PageHeader } from '@comitium/ui/page-header';
import { PageLoader } from '@comitium/ui/page-loader';
import { useSession } from '../../use-session';
import type { ZkIdentityApi } from '../../zk-identity';
import { ZkIdentitySection } from './zk-identity-section';

export function ZkIdentitySettingsPage({
  api,
  queryKey,
}: {
  api: ZkIdentityApi;
  queryKey: (userId: string) => readonly unknown[];
}) {
  const { user } = useSession();

  if (!user) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="ZK Identity" />
      <ZkIdentitySection key={user.id} api={api} queryKey={queryKey(user.id)} />
    </div>
  );
}
