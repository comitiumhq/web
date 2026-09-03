import type { AccountStage } from '@comitium/auth/account-stage';
import type { InviteInfo } from '@/lib/schemas/org';

export type InvitePageState =
  | 'invalid'
  | 'loading'
  | 'not_found'
  | 'revoked'
  | 'expired'
  | 'account_recovery'
  | 'login'
  | 'preparing'
  | 'ready';

interface ResolveInvitePageStateInput {
  token: string | null;
  isLoading: boolean;
  hasError: boolean;
  invite: InviteInfo | undefined;
  accountStage: AccountStage;
}

export function resolveInvitePageState({
  token,
  isLoading,
  hasError,
  invite,
  accountStage,
}: ResolveInvitePageStateInput): InvitePageState {
  if (!token) {
    return 'invalid';
  }

  if (isLoading) {
    return 'loading';
  }

  if (hasError || !invite) {
    return 'not_found';
  }

  if (invite.isRevoked) {
    return 'revoked';
  }

  if (invite.isExpired && !invite.isAccepted) {
    return 'expired';
  }

  if (accountStage === 'unrecoverable') {
    return 'account_recovery';
  }

  if (accountStage === 'anonymous') {
    return 'login';
  }

  if (accountStage !== 'ready') {
    return 'preparing';
  }

  return 'ready';
}
