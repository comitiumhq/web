import { describe, expect, it } from 'vitest';
import {
  canAccessOrganizationOnboarding,
  getAccessibleCreatedOrganizationId,
  hasInactiveOrganizationMembership,
  workspaceSetupSchema,
} from '../org';

describe('canAccessOrganizationOnboarding', () => {
  it('allows a signed-in account with no active organization to enter setup', () => {
    expect(canAccessOrganizationOnboarding({ status: 'needs_verification' }, 0)).toBe(true);
    expect(canAccessOrganizationOnboarding({ status: 'creating', email: null, domain: 'example.com' }, 0)).toBe(true);
  });

  it('blocks setup for any active organization member', () => {
    expect(canAccessOrganizationOnboarding({ status: 'needs_verification' }, 1)).toBe(false);
  });

  it('blocks setup after an organization has already been created', () => {
    expect(
      canAccessOrganizationOnboarding(
        {
          status: 'created',
          organizationId: 'f2446f4b-6468-4be8-b903-b2bd70ec0304',
          hasActiveMembership: false,
        },
        0,
      ),
    ).toBe(false);
  });

  it('does not replay organization setup for a deactivated invited member', () => {
    expect(canAccessOrganizationOnboarding({ status: 'inactive_membership' }, 0)).toBe(false);
  });
});

describe('getAccessibleCreatedOrganizationId', () => {
  it('preserves the created-organization redirect while membership queries catch up', () => {
    expect(
      getAccessibleCreatedOrganizationId({
        status: 'created',
        organizationId: 'f2446f4b-6468-4be8-b903-b2bd70ec0304',
        hasActiveMembership: true,
      }),
    ).toBe('f2446f4b-6468-4be8-b903-b2bd70ec0304');
  });

  it('does not expose a deactivated created-organization membership', () => {
    expect(
      getAccessibleCreatedOrganizationId({
        status: 'created',
        organizationId: 'f2446f4b-6468-4be8-b903-b2bd70ec0304',
        hasActiveMembership: false,
      }),
    ).toBeNull();
  });
});

describe('hasInactiveOrganizationMembership', () => {
  it('recognizes inactive invited members and deactivated organization creators', () => {
    expect(hasInactiveOrganizationMembership({ status: 'inactive_membership' })).toBe(true);
    expect(
      hasInactiveOrganizationMembership({
        status: 'created',
        organizationId: 'f2446f4b-6468-4be8-b903-b2bd70ec0304',
        hasActiveMembership: false,
      }),
    ).toBe(true);
  });

  it('keeps an active organization creator in the organization redirect flow', () => {
    expect(
      hasInactiveOrganizationMembership({
        status: 'created',
        organizationId: 'f2446f4b-6468-4be8-b903-b2bd70ec0304',
        hasActiveMembership: true,
      }),
    ).toBe(false);
  });
});

describe('workspaceSetupSchema', () => {
  it('accepts the fixed five-step server read model', () => {
    expect(
      workspaceSetupSchema.parse({
        required: {
          companyDetails: { complete: true },
          department: { complete: true },
          location: { complete: false },
          recruitingPrivacy: { complete: false },
          firstJob: { complete: false },
        },
        recommended: { inviteTeammate: { complete: true } },
        completedRequired: 2,
        requiredTotal: 5,
        complete: false,
      }),
    ).toMatchObject({ completedRequired: 2, requiredTotal: 5, complete: false });
  });

  it('rejects a server response that changes the required-step denominator', () => {
    expect(() =>
      workspaceSetupSchema.parse({
        required: {
          companyDetails: { complete: true },
          department: { complete: true },
          location: { complete: true },
          recruitingPrivacy: { complete: true },
          firstJob: { complete: true },
        },
        recommended: { inviteTeammate: { complete: false } },
        completedRequired: 5,
        requiredTotal: 4,
        complete: true,
      }),
    ).toThrow();
  });
});
