import { type HeaderNavItem, HeaderNavLink } from '@comitium/ui/header-nav-link';

const JOBS_NAV_ITEM: HeaderNavItem = {
  label: 'Jobs',
  path: '/jobs',
  isActive: (pathname) => pathname.startsWith('/jobs') || pathname.startsWith('/careers'),
};

interface PublicNavProps {
  pathname: string;
}

export function PublicNav({ pathname }: PublicNavProps) {
  return (
    <nav className="flex items-center gap-1 whitespace-nowrap" aria-label="Primary navigation">
      <HeaderNavLink item={JOBS_NAV_ITEM} pathname={pathname} />
    </nav>
  );
}
