import { describe, expect, it } from 'vitest';

import { getMaterializedCreatedOrganizationId } from './org-materialization';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

describe('organization route materialization', () => {
  it('does not initialize organization services before the prepared organization materializes', () => {
    const creation = { status: 'created', organizationId: ORGANIZATION_ID, hasActiveMembership: true } as const;

    expect(getMaterializedCreatedOrganizationId(creation, [])).toBeNull();
    expect(getMaterializedCreatedOrganizationId(creation, [{ id: ORGANIZATION_ID }])).toBe(ORGANIZATION_ID);
  });
});
