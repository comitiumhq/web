import { type HeaderNavItem, HeaderNavLink } from '@comitium/ui/header-nav-link';

const JOBS_NAV_ITEM: HeaderNavItem = {
  label: 'Jobs',
  path: '/jobs',
  isActive: (pathname) => pathname.startsWith('/jobs') || pathname.startsWith('/careers'),
};

const MY_APPLICATIONS_NAV_ITEM: HeaderNavItem = {
  label: 'My Applications',
  path: '/applications',
  isActive: (pathname) => pathname === '/applications',
};

interface PublicNavProps {
  pathname: string;
}

export function PublicNav({ pathname }: PublicNavProps) {
  return (
    <nav className="hidden items-center gap-1 md:flex">
      <HeaderNavLink item={JOBS_NAV_ITEM} pathname={pathname} />

      <HeaderNavLink item={MY_APPLICATIONS_NAV_ITEM} pathname={pathname} />
    </nav>
  );
}
