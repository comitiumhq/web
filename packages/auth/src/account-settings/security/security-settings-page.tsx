import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { PageHeader } from '@comitium/ui/page-header';
import { useSession } from '../../use-session';
import { DataProtectionSection } from './data-protection-section';
import { SessionsSection } from './sessions-section';

export function SecuritySettingsPage() {
  const { user } = useSession();

  if (!user) {
    return null;
  }

  const hasUserKey = hasEncryptionKeyBundle(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Security" />
      {hasUserKey ? <DataProtectionSection user={user} /> : null}
      <SessionsSection hasUserKey={hasUserKey} />
    </div>
  );
}
