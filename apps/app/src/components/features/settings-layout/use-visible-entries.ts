import { useMemo } from 'react';

import { useQueryOrgMe } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/schemas/org';

import type { SidebarEntry, SidebarGroup, SidebarItem } from './sidebar-config';

export function useVisibleEntries(orgId: string, entries: SidebarEntry[]): SidebarEntry[] {
  const { data: meData } = useQueryOrgMe(orgId);
  const permissions = meData?.permissions;
  const role = meData?.role;

  return useMemo(() => {
    const isVisible = (item: SidebarItem) => isItemVisible(item, permissions, role);

    return entries.flatMap((entry) => filterEntry(entry, isVisible));
  }, [entries, permissions, role]);
}

function filterEntry(entry: SidebarEntry, isVisible: (item: SidebarItem) => boolean): SidebarEntry[] {
  if (entry.type === 'item') {
    return isVisible(entry) ? [entry] : [];
  }

  const visibleItems = entry.items.filter(isVisible);

  if (visibleItems.length === 0) {
    return [];
  }

  const filteredGroup: SidebarGroup = { ...entry, items: visibleItems };

  return [filteredGroup];
}

function isItemVisible(item: SidebarItem, permissions?: Permission[], role?: string): boolean {
  if (!permissions || !role) {
    return item.permission === null && !item.orgAdminOnly;
  }

  if (item.orgAdminOnly) {
    return role === 'org_admin';
  }

  return item.permission === null || permissions.includes(item.permission);
}
