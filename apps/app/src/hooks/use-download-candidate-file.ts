import { CryptoProxy, type VaultKeyAccess } from '@comitium/crypto';
import { encryptedFileContext } from '@comitium/crypto/context';
import type { CandidateFile } from '@comitium/schemas/candidates';
import type { FileDisplayMetadata } from '@comitium/schemas/forms/form-submission';
import { useState } from 'react';
import { toast } from 'sonner';
import { fetchEncryptedCandidateFile } from '@/lib/api/candidates';
import { triggerFileDownload } from '@/lib/utils';

export function useDownloadCandidateFile(orgId: string, candidateId: string, access?: VaultKeyAccess) {
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  async function download(file: CandidateFile, metadata?: FileDisplayMetadata) {
    if (!access || downloadingFileId) {
      return;
    }

    setDownloadingFileId(file.id);

    try {
      const encrypted = await fetchEncryptedCandidateFile(candidateId, file.id);

      const bytes = await CryptoProxy.decryptFile(
        new Uint8Array(encrypted),
        orgId,
        access,
        encryptedFileContext(orgId, file.id, file.kind),
      );

      triggerFileDownload(bytes, metadata?.fileName ?? file.kind, metadata?.mimeType ?? 'application/octet-stream');
    } catch {
      toast.error('File could not be downloaded');
    } finally {
      setDownloadingFileId(null);
    }
  }

  return { download, downloadingFileId };
}
