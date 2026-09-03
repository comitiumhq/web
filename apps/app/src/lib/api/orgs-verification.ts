import { sendVerificationSchema, verifyCodeSchema } from '@/lib/schemas/org';

import { api } from './client';

export function sendVerification(email: string) {
  return api.post('/orgs/send-verification', { email }, sendVerificationSchema);
}

export function verifyCode(email: string, code: string) {
  return api.post('/orgs/verify-code', { email, code }, verifyCodeSchema);
}
