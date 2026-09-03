export interface PrivyAccountUser {
  email?: { address: string } | null;
  google?: { email: string } | null;
}

export function getPrivyAccountEmail(user?: PrivyAccountUser | null): string | null {
  return user?.email?.address ?? user?.google?.email ?? null;
}
