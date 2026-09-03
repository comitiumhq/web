import type { CandidateProfile } from '@comitium/schemas/candidates';
import { Button } from '@comitium/ui/button';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import type { DecryptedEmail } from '@/lib/schemas/emails';

import { EmailCard, EmailCardSkeleton } from './email-card';

export interface EmailCollectionState {
  data: DecryptedEmail[] | null;
  decryptionError: string | null;
  isDecrypting: boolean;
  isLoading: boolean;
  isError: boolean;
  isLoadingDecryptionKey: boolean;
  isDecryptionKeyError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onRetryQuery: () => void;
  onRetryDecryption: () => void;
  onRetryDecryptionKey: () => void;
  onLoadMore: () => void;
}

interface EmailsTabProps {
  orgId: string;
  candidateProfile: CandidateProfile | null;
  collection: EmailCollectionState;
}

function EmailsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3 py-1">
      <span className="sr-only">Loading emails</span>
      <EmailCardSkeleton />
      <EmailCardSkeleton />
    </div>
  );
}

export function EmailsTab({ orgId, candidateProfile, collection }: EmailsTabProps) {
  const { isUnlocked } = useEncryptionUnlocked(orgId);
  const {
    data,
    decryptionError,
    isDecrypting,
    isLoading,
    isError,
    isLoadingDecryptionKey,
    isDecryptionKeyError,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    onRetryQuery,
    onRetryDecryption,
    onRetryDecryptionKey,
    onLoadMore,
  } = collection;
  const isPreparing = isLoading || isLoadingDecryptionKey;
  const isReady = !isPreparing && !isError && !isDecryptionKeyError && isUnlocked;

  return (
    <div className="flex-1 overflow-y-auto min-h-0 h-full">
      <div className="flex flex-col gap-3 px-4 pb-4 pt-20">
        {isPreparing && <EmailsSkeleton />}

        {!isPreparing && isError && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Emails could not be loaded.</p>
            <Button type="button" variant="outline" size="xs" onClick={onRetryQuery}>
              Try again
            </Button>
          </div>
        )}

        {!isPreparing && !isError && isDecryptionKeyError && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Encryption access could not be loaded.</p>
            <Button type="button" variant="outline" size="xs" onClick={onRetryDecryptionKey}>
              Try again
            </Button>
          </div>
        )}

        {!isPreparing && !isError && !isDecryptionKeyError && !isUnlocked && (
          <EncryptedPlaceholder orgId={orgId} variant="block" lines={5} />
        )}

        {isReady && decryptionError && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Emails could not be decrypted.</p>
            <Button type="button" variant="outline" size="xs" onClick={onRetryDecryption}>
              Try again
            </Button>
          </div>
        )}

        {isReady && isDecrypting && !data && <EmailsSkeleton />}

        {isReady && data?.map((msg) => <EmailCard key={msg.id} email={msg} candidateProfile={candidateProfile} />)}

        {isReady && !decryptionError && isDecrypting && data && <EmailsSkeleton />}

        {isReady && !decryptionError && !isDecrypting && data?.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No emails yet</p>
        )}

        {isReady && !decryptionError && (
          <InfiniteCollectionStatus
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            loadingLabel="Loading emails..."
            errorLabel="Could not load more emails."
            onLoadMore={onLoadMore}
          />
        )}
      </div>
    </div>
  );
}
