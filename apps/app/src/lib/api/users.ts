import type { PublicEncryptionKey } from '@comitium/crypto/schemas';
import { publicKeyMapSchema } from '@comitium/schemas/auth';

import { api } from './client';

function getPublicKeys(addresses: string[]) {
  return api.post('/users/public-keys', { addresses }, publicKeyMapSchema);
}

export async function getPublicKey(walletAddress: string): Promise<PublicEncryptionKey | null> {
  const publicKeys = await getPublicKeys([walletAddress]);

  return publicKeys[walletAddress] ?? null;
}
