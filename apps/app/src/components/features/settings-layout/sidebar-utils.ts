import type { SidebarEntry, SidebarGroup } from './sidebar-config';

export function groupIds(entries: SidebarEntry[]): string[] {
  return entries.filter((e): e is SidebarGroup => e.type === 'group').map((g) => g.id);
}

export function activeGroupIds(entries: SidebarEntry[], pathname: string): string[] {
  return entries
    .filter((e): e is SidebarGroup => e.type === 'group' && e.items.some((i) => i.match(pathname)))
    .map((g) => g.id);
}
