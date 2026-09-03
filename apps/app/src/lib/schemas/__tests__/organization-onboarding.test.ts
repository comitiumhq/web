import { describe, expect, it } from 'vitest';
import { canAccessOrganizationOnboarding } from '../org';

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
});
