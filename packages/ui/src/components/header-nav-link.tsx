import { Link } from '@tanstack/react-router';
import { memo } from 'react';

import { cn } from '../lib/cn';

const headerNavLinkClassName =
  'rounded-lg px-3 py-2 text-label-14 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none';

export interface HeaderNavItem {
  isActive: (pathname: string) => boolean;
  label: string;
  path: string;
}

interface HeaderNavLinkProps {
  item: HeaderNavItem;
  pathname: string;
}

export const HeaderNavLink = memo(function HeaderNavLink({ item, pathname }: HeaderNavLinkProps) {
  const isActive = item.isActive(pathname);

  return (
    <Link
      to={item.path}
      aria-current={isActive ? 'page' : undefined}
      className={cn(headerNavLinkClassName, {
        'font-medium text-foreground': isActive,
        'text-muted-foreground hover:text-foreground': !isActive,
      })}
    >
      {item.label}
    </Link>
  );
});
