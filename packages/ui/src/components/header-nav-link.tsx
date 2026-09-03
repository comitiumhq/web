import { Link } from '@tanstack/react-router';
import { memo } from 'react';

import { cn } from '../lib/cn';

const headerNavLinkClassName =
  'rounded-4xl px-3 py-2 text-label-14 transition-colors duration-150 hover:bg-muted hover:text-foreground';

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
      className={cn(headerNavLinkClassName, {
        'bg-muted font-medium text-foreground': isActive,
        'text-muted-foreground': !isActive,
      })}
    >
      {item.label}
    </Link>
  );
});
