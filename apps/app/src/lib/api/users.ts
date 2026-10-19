import { publicKeyMapSchema } from '@comitium/schemas/auth';

import { api } from './client';

function getPublicKeys(userIds: string[]) {
  return api.post('/users/public-keys', { userIds }, publicKeyMapSchema);
}

export async function getPublicKey(userId: string) {
  const publicKeys = await getPublicKeys([userId]);

  return publicKeys[userId] ?? null;
}
