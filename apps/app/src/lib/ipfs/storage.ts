import { z } from 'zod';

import { api, isTransientApiError } from '@/lib/api/client';
import { withRetry } from '@/lib/utils';

const ipfsUploadSchema = z
  .object({
    cid: z.string().min(1),
    uri: z.string().startsWith('ipfs://'),
  })
  .strict();

export async function uploadFile(orgId: string, file: File): Promise<string> {
  return withRetry(
    async () => {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.upload(`/orgs/${orgId}/storage/ipfs/images`, formData, ipfsUploadSchema);

      return result.uri;
    },
    { shouldRetry: isTransientApiError },
  );
}
