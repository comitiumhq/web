import { PageContainer } from '@comitium/ui/page-container';
import { useLocation } from '@tanstack/react-router';
import { type ReactNode, useMemo } from 'react';

import { SettingsMobileNav } from './settings-mobile-nav';
import { SettingsSidebar } from './settings-sidebar';
import { buildSidebarEntries, type SidebarEntry, type SidebarItem } from './sidebar-config';
import { useVisibleEntries } from './use-visible-entries';

interface SettingsLayoutProps {
  orgId: string;
  children: ReactNode;
}

export function SettingsLayout({ orgId, children }: SettingsLayoutProps) {
  const { pathname } = useLocation();
  const basePath = `/org/${orgId}/organization`;

  const allEntries = useMemo(() => buildSidebarEntries(basePath), [basePath]);
  const visibleEntries = useVisibleEntries(orgId, allEntries);

  const activeItem = findActiveItem(visibleEntries, pathname);

  return (
    <PageContainer size="settings" className="h-full sm:px-4 lg:px-4">
      <div className="flex h-full min-h-0 gap-8 overflow-hidden">
        <SettingsSidebar entries={visibleEntries} pathname={pathname} />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col py-6">
          <SettingsMobileNav entries={visibleEntries} pathname={pathname} activeLabel={activeItem?.label} />
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">{children}</div>
        </main>
      </div>
    </PageContainer>
  );
}

function findActiveItem(entries: SidebarEntry[], pathname: string): SidebarItem | undefined {
  for (const entry of entries) {
    if (entry.type === 'item' && entry.match(pathname)) {
      return entry;
    }

    if (entry.type === 'group') {
      const match = entry.items.find((item) => item.match(pathname));

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}
