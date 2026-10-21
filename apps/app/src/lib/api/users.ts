import { userPublicKeyDescriptorMapSchema } from '@comitium/schemas/auth';

import { api } from './client';

function getUserPublicKeyDescriptors(userIds: string[]) {
  return api.post('/users/public-keys', { userIds }, userPublicKeyDescriptorMapSchema);
}

export async function getUserPublicKeyDescriptor(userId: string) {
  const descriptors = await getUserPublicKeyDescriptors([userId]);

  return descriptors[userId] ?? null;
}
