import type { HeaderNavItem } from '@comitium/ui/header-nav-link';
import type { OrgRole } from '@/lib/schemas/org';

export type { HeaderNavItem } from '@comitium/ui/header-nav-link';

interface OrgHeaderNavItem extends HeaderNavItem {
  isVisible: (role: OrgRole | null) => boolean;
}

export function getVisibleOrgHeaderNavItems(orgId: string, role: OrgRole | null): HeaderNavItem[] {
  return getOrgHeaderNavItems(orgId).filter((item) => item.isVisible(role));
}

function getOrgHeaderNavItems(orgId: string): OrgHeaderNavItem[] {
  const basePath = `/org/${orgId}`;

  return [
    {
      label: 'Home',
      path: basePath,
      isActive: (pathname) => pathname === basePath || pathname === `${basePath}/`,
      isVisible: () => true,
    },
    {
      label: 'Pipeline',
      path: `${basePath}/pipeline`,
      isActive: (pathname) => pathname.startsWith(`${basePath}/pipeline`),
      isVisible: () => true,
    },
    {
      label: 'Jobs',
      path: `${basePath}/jobs`,
      isActive: (pathname) =>
        pathname === `${basePath}/jobs` || pathname === `${basePath}/jobs/` || pathname.startsWith(`${basePath}/jobs/`),
      isVisible: () => true,
    },
    {
      label: 'Organization',
      path: `${basePath}/organization`,
      isActive: (pathname) => pathname.startsWith(`${basePath}/organization`),
      isVisible: (role) => role === 'org_admin',
    },
  ];
}
