import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import type { VaultKeyAccess } from '@comitium/crypto';
import { CryptoProxy } from '@comitium/crypto';
import { encryptedFileContext } from '@comitium/crypto/context';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { fetchEncryptedApplicationFile } from '@/lib/api/application-files';
import { getErrorMessage, triggerFileDownload } from '@/lib/utils';

interface UseDownloadApplicationFileOptions {
  orgId: string;
  applicationId: string | null;
  interviewEventId?: string;
  vaultAccess: VaultKeyAccess | undefined;
}

export function useDownloadApplicationFile({
  orgId,
  applicationId,
  interviewEventId,
  vaultAccess,
}: UseDownloadApplicationFileOptions) {
  const [downloadingQuestionId, setDownloadingQuestionId] = useState<string | null>(null);
  const { canUnlock, ensureUnlocked } = useCryptoUnlock();

  const canDownload = !!applicationId && canUnlock && !!vaultAccess;

  const download = useCallback(
    async (questionId: string, fileId: string, filename: string, mimeType?: string) => {
      if (!canDownload || !applicationId || !vaultAccess) {
        return;
      }

      setDownloadingQuestionId(questionId);

      try {
        await ensureUnlocked();

        const encryptedBuffer = await fetchEncryptedApplicationFile(applicationId, questionId, interviewEventId);
        const bytes = await CryptoProxy.decryptFile(
          new Uint8Array(encryptedBuffer),
          orgId,
          vaultAccess,
          encryptedFileContext(orgId, fileId, 'attachment'),
        );

        triggerFileDownload(bytes, filename, mimeType ?? 'application/octet-stream');
      } catch (error) {
        toast.error('Failed to download attachment', { description: getErrorMessage(error) });
      } finally {
        setDownloadingQuestionId(null);
      }
    },
    [canDownload, applicationId, vaultAccess, orgId, interviewEventId, ensureUnlocked],
  );

  return { download, downloadingQuestionId, canDownload };
}
