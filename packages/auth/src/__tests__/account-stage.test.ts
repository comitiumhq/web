import { describe, expect, it } from 'vitest';

import { type AccountStageInput, getAccountStage, isAccountLoading, isAccountSettled } from '../account-stage';

const SIGNED_OUT: AccountStageInput = {
  authenticated: false,
  hasAccount: false,
  hasAuthTokens: false,
  hasCanonicalWallet: false,
  isSessionSettled: false,
  privyReady: true,
};

const AUTHENTICATED_WITHOUT_WALLET: AccountStageInput = {
  ...SIGNED_OUT,
  authenticated: true,
  hasAuthTokens: true,
};

const WALLET_PROVISIONED: AccountStageInput = {
  ...AUTHENTICATED_WITHOUT_WALLET,
  hasCanonicalWallet: true,
};

const ACCOUNT_READY: AccountStageInput = {
  ...WALLET_PROVISIONED,
  hasAccount: true,
  isSessionSettled: true,
};

describe('account stage', () => {
  it('waits for Privy before deciding anything', () => {
    expect(getAccountStage({ ...ACCOUNT_READY, privyReady: false })).toBe('authenticating');
  });

  it('treats a settled unauthenticated visitor as anonymous', () => {
    expect(getAccountStage(SIGNED_OUT)).toBe('anonymous');
  });

  it('keeps authenticating until the identity token is available on the header transport', () => {
    expect(getAccountStage({ ...AUTHENTICATED_WITHOUT_WALLET, hasAuthTokens: false })).toBe('authenticating');
  });

  it('provisions the canonical wallet before resolving the session', () => {
    expect(getAccountStage(AUTHENTICATED_WITHOUT_WALLET)).toBe('provisioning-wallet');
  });

  it('resolves the session only once the canonical wallet exists', () => {
    expect(getAccountStage(WALLET_PROVISIONED)).toBe('resolving-session');
  });

  it('reaches ready when session resolution returned an account', () => {
    expect(getAccountStage(ACCOUNT_READY)).toBe('ready');
  });

  it('marks a settled session without an account as unrecoverable', () => {
    expect(getAccountStage({ ...ACCOUNT_READY, hasAccount: false })).toBe('unrecoverable');
  });

  it('never reports a signed-in account while the wallet is still missing', () => {
    expect(getAccountStage({ ...AUTHENTICATED_WITHOUT_WALLET, hasAccount: true, isSessionSettled: true })).toBe(
      'provisioning-wallet',
    );
  });

  it('classifies every stage as either loading or settled', () => {
    const stages = [
      getAccountStage({ ...ACCOUNT_READY, privyReady: false }),
      getAccountStage(SIGNED_OUT),
      getAccountStage(AUTHENTICATED_WITHOUT_WALLET),
      getAccountStage(WALLET_PROVISIONED),
      getAccountStage(ACCOUNT_READY),
      getAccountStage({ ...ACCOUNT_READY, hasAccount: false }),
    ];

    for (const stage of stages) {
      expect(isAccountLoading(stage)).toBe(!isAccountSettled(stage));
    }
  });
});
