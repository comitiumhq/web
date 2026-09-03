import { PageContainer } from '@comitium/ui/page-container';
import { CalendarIcon, type Icon as PhosphorIcon, UserIcon } from '@phosphor-icons/react';
import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { useCallback } from 'react';
import { OrgGuard } from '@/components/auth/org-guard';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/org/$orgId/settings')({
  ssr: false,
  component: PersonalSettingsLayout,
});

interface PersonalSettingsNavItem {
  label: string;
  path: string;
  icon: PhosphorIcon;
  match: (pathname: string) => boolean;
}

function PersonalSettingsLayout() {
  const { orgId } = Route.useParams();
  const renderSettingsContent = useCallback(() => <PersonalSettingsLayoutContent orgId={orgId} />, [orgId]);

  return <OrgGuard orgId={orgId}>{renderSettingsContent}</OrgGuard>;
}

function PersonalSettingsLayoutContent({ orgId }: { orgId: string }) {
  const { pathname } = useLocation();
  const basePath = `/org/${orgId}/settings`;

  const items: PersonalSettingsNavItem[] = [
    { label: 'Profile', path: basePath, icon: UserIcon, match: (p) => p === basePath || p === `${basePath}/` },
    {
      label: 'Calendar',
      path: `${basePath}/calendar`,
      icon: CalendarIcon,
      match: (p) => p.startsWith(`${basePath}/calendar`),
    },
  ];

  return (
    <PageContainer size="settings" className="h-full">
      <div className="flex h-full min-h-0 gap-10 overflow-hidden">
        <aside className="hidden w-52 shrink-0 py-6 sm:py-10 lg:block">
          <nav className="sticky top-6 flex flex-col gap-1">
            {items.map((item) => (
              <PersonalSettingsNavLink key={item.path} item={item} active={item.match(pathname)} />
            ))}
          </nav>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col py-6 sm:py-10">
          <nav className="mb-6 flex gap-1 lg:hidden">
            {items.map((item) => (
              <PersonalSettingsNavLink key={item.path} item={item} active={item.match(pathname)} />
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

function PersonalSettingsNavLink({ item, active }: { item: PersonalSettingsNavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className={cn(
        'flex h-9 min-w-0 items-center gap-3 rounded-xl px-3 text-label-14 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        {
          'bg-accent text-accent-foreground': active,
          'hover:bg-accent hover:text-accent-foreground': !active,
        },
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}
