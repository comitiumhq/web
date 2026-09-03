import { getAccessibleCreatedOrganizationId, type OrgCreationStatus } from '@/lib/schemas/org';

export function getMaterializedCreatedOrganizationId(
  creation: OrgCreationStatus | undefined,
  organizations: readonly { id: string }[],
): string | null {
  const organizationId = getAccessibleCreatedOrganizationId(creation);

  if (organizationId === null) {
    return null;
  }

  return organizations.some((organization) => organization.id === organizationId) ? organizationId : null;
}
