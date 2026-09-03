import type { HeaderNavItem } from './nav-items';
import { OrgNav } from './org-nav';

interface WorkspaceNavProps {
  isOrgContext: boolean;
  orgNavItems: HeaderNavItem[];
  pathname: string;
}

export function WorkspaceNav({ isOrgContext, orgNavItems, pathname }: WorkspaceNavProps) {
  if (orgNavItems.length > 0) {
    return <OrgNav items={orgNavItems} pathname={pathname} />;
  }

  if (isOrgContext) {
    return null;
  }

  return null;
}
