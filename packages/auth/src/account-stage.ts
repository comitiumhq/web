export type AccountStage =
  | 'anonymous'
  | 'authenticating'
  | 'provisioning-wallet'
  | 'resolving-session'
  | 'ready'
  | 'unrecoverable';

export interface AccountStageInput {
  authenticated: boolean;
  hasAuthTokens: boolean;
  hasCanonicalWallet: boolean;
  isSessionSettled: boolean;
  privyReady: boolean;
  hasAccount: boolean;
}

const LOADING_STAGES: readonly AccountStage[] = ['authenticating', 'provisioning-wallet', 'resolving-session'];
const SETTLED_STAGES: readonly AccountStage[] = ['anonymous', 'ready', 'unrecoverable'];

export function getAccountStage(input: AccountStageInput): AccountStage {
  if (!input.privyReady) {
    return 'authenticating';
  }

  if (!input.authenticated) {
    return 'anonymous';
  }

  if (!input.hasAuthTokens) {
    return 'authenticating';
  }

  if (!input.hasCanonicalWallet) {
    return 'provisioning-wallet';
  }

  if (!input.isSessionSettled) {
    return 'resolving-session';
  }

  if (!input.hasAccount) {
    return 'unrecoverable';
  }

  return 'ready';
}

export function isAccountLoading(stage: AccountStage): boolean {
  return LOADING_STAGES.includes(stage);
}

export function isAccountSettled(stage: AccountStage): boolean {
  return SETTLED_STAGES.includes(stage);
}
