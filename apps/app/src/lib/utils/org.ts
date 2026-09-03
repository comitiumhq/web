import { LS_LAST_ORG_ID } from '@comitium/auth/storage';
import type { MyOrg, OrgRole } from '@/lib/schemas/org';

export function getOrgDisplayName(org: MyOrg): string {
  if (org.name) {
    return org.name;
  }

  if (org.domain) {
    return org.domain;
  }

  return `Org #${org.orgId}`;
}

export function formatOrgRole(role: OrgRole): string {
  const labels: Record<OrgRole, string> = {
    org_admin: 'Organization Admin',
    org_member: 'Member',
  };

  return labels[role];
}

export function getPreferredOrg(orgs: MyOrg[]): MyOrg | null {
  const lastOrgId = globalThis.localStorage?.getItem(LS_LAST_ORG_ID) ?? null;

  if (lastOrgId) {
    const found = orgs.find((org) => org.id === lastOrgId);

    if (found) {
      return found;
    }
  }

  return orgs[0] ?? null;
}
