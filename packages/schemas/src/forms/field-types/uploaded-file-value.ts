import { z } from 'zod';

export const uploadedFileValueSchema = z.object({
  fileRef: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string().min(1).max(255),
});
