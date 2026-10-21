export type AccountStage = 'anonymous' | 'authenticating' | 'resolving-account' | 'ready';

const LOADING_STAGES: readonly AccountStage[] = ['authenticating', 'resolving-account'];
const SETTLED_STAGES: readonly AccountStage[] = ['anonymous', 'ready'];

export function isAccountLoading(stage: AccountStage): boolean {
  return LOADING_STAGES.includes(stage);
}

export function isAccountSettled(stage: AccountStage): boolean {
  return SETTLED_STAGES.includes(stage);
}
