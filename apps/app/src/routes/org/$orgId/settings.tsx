import { PageContainer } from '@comitium/ui/page-container';
import { SettingsNavLink } from '@comitium/ui/settings-nav-link';
import { CalendarIcon, type Icon as PhosphorIcon, UserIcon } from '@phosphor-icons/react';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useCallback } from 'react';
import { OrgGuard } from '@/components/auth/org-guard';

export const Route = createFileRoute('/org/$orgId/settings')({
  ssr: false,
  component: PersonalSettingsLayout,
});

interface PersonalSettingsNavItem {
  label: string;
  path: string;
  icon: PhosphorIcon;
}

function PersonalSettingsLayout() {
  const { orgId } = Route.useParams();
  const renderSettingsContent = useCallback(() => <PersonalSettingsLayoutContent orgId={orgId} />, [orgId]);

  return <OrgGuard orgId={orgId}>{renderSettingsContent}</OrgGuard>;
}

function PersonalSettingsLayoutContent({ orgId }: { orgId: string }) {
  const basePath = `/org/${orgId}/settings`;

  const items: PersonalSettingsNavItem[] = [
    { label: 'Profile', path: basePath, icon: UserIcon },
    {
      label: 'Calendar',
      path: `${basePath}/calendar`,
      icon: CalendarIcon,
    },
  ];

  return (
    <PageContainer size="settings" className="h-full sm:px-4 lg:px-4">
      <div className="flex h-full min-h-0 gap-8 overflow-hidden">
        <aside className="hidden w-68 shrink-0 py-6 lg:block">
          <div className="sticky top-6">
            <p className="text-heading-20">Settings</p>
            <nav aria-label="Settings" className="mt-7 flex flex-col gap-1">
              {items.map((item) => (
                <SettingsNavLink key={item.path} icon={item.icon} label={item.label} to={item.path} />
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col py-6">
          <nav aria-label="Settings" className="mb-6 flex gap-1 lg:hidden">
            {items.map((item) => (
              <SettingsNavLink key={item.path} icon={item.icon} label={item.label} to={item.path} />
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
            <Outlet />
          </div>
        </main>
      </div>
    </PageContainer>
  );
}
