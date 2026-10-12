import { z } from 'zod';
import { api } from './api/client';

export interface EarlyAccessRequest {
  email: string;
  company?: string;
  turnstileToken: string;
  requestId: string;
}

const earlyAccessResponseSchema = z.object({ success: z.literal(true) });

export function submitEarlyAccessRequest(request: EarlyAccessRequest) {
  return api.post('/marketing/early-access', request, earlyAccessResponseSchema);
}
