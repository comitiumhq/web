import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { PageHeader } from '@comitium/ui/page-header';
import { Navigate } from '@tanstack/react-router';

import { useSession } from '../../use-session';
import { DataProtectionSection } from './data-protection-section';

export function RecoverySettingsPage() {
  const { user } = useSession();

  if (!user) {
    return null;
  }

  if (!hasEncryptionKeyBundle(user)) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recovery" />
      <DataProtectionSection user={user} />
    </div>
  );
}
