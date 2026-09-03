import type { FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';
import { Skeleton } from '@comitium/ui/skeleton';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { FormDisplay } from '@/components/features/form-runtime';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';

import type { DecryptedEntry } from './types';

interface EntryBodyProps {
  entry: DecryptedEntry;
  snapshot: FormDefinitionSnapshot;
  canReadPrivate: boolean;
  orgId: string;
}

export function EntryBody({ entry, snapshot, canReadPrivate, orgId }: EntryBodyProps) {
  const { isUnlocked } = useEncryptionUnlocked(orgId);

  if (entry.status === 'ready') {
    return (
      <div className="pt-2">
        <FormDisplay snapshot={snapshot} answers={entry.values} canReadPrivate={canReadPrivate} />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="pt-2">
        <EncryptedPlaceholder orgId={orgId} variant="block" withBorder={false} lines={3} />
      </div>
    );
  }

  if (entry.status === 'error') {
    return <p className="text-xs text-destructive py-2">Failed to decrypt: {entry.message}</p>;
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
