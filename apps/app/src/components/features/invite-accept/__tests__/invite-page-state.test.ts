import { describe, expect, it } from 'vitest';
import type { InviteInfo } from '@/lib/schemas/org';
import { resolveInvitePageState } from '../invite-page-state';

const ACTIVE_INVITE: InviteInfo = {
  orgName: 'Comitium',
  orgLogo: null,
  role: 'org_member',
  email: 'recruiter@comitium.test',
  expiresAt: '2026-08-31T00:00:00.000Z',
  isExpired: false,
  isRevoked: false,
  isAccepted: false,
};

function resolve(overrides: Partial<Parameters<typeof resolveInvitePageState>[0]> = {}) {
  return resolveInvitePageState({
    token: 'invite-token',
    isLoading: false,
    hasError: false,
    invite: ACTIVE_INVITE,
    accountStage: 'ready',
    ...overrides,
  });
}

describe('resolveInvitePageState', () => {
  it('prioritizes invalid, loading, and missing invite states', () => {
    expect(resolve({ token: null })).toBe('invalid');
    expect(resolve({ isLoading: true })).toBe('loading');
    expect(resolve({ hasError: true })).toBe('not_found');
    expect(resolve({ invite: undefined })).toBe('not_found');
  });

  it('routes active invitations according to the global account stage', () => {
    expect(resolve({ accountStage: 'anonymous' })).toBe('login');
    expect(resolve({ accountStage: 'authenticating' })).toBe('preparing');
    expect(resolve({ accountStage: 'provisioning-wallet' })).toBe('preparing');
    expect(resolve({ accountStage: 'resolving-session' })).toBe('preparing');
    expect(resolve({ accountStage: 'unrecoverable' })).toBe('account_recovery');
    expect(resolve({ accountStage: 'ready' })).toBe('ready');
  });

  it('blocks revoked and unaccepted expired invitations before account actions', () => {
    expect(resolve({ invite: { ...ACTIVE_INVITE, isRevoked: true } })).toBe('revoked');
    expect(resolve({ invite: { ...ACTIVE_INVITE, isExpired: true } })).toBe('expired');
  });

  it('lets the original account recover an accepted invitation after expiry', () => {
    const acceptedExpiredInvite = {
      ...ACTIVE_INVITE,
      isAccepted: true,
      isExpired: true,
    };

    expect(resolve({ invite: acceptedExpiredInvite, accountStage: 'anonymous' })).toBe('login');
    expect(resolve({ invite: acceptedExpiredInvite, accountStage: 'ready' })).toBe('ready');
  });
});
