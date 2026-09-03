import { Button } from '@comitium/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { HeaderNavLink } from '@comitium/ui/header-nav-link';
import { ListIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import type { HeaderNavItem } from './nav-items';

interface OrgNavProps {
  items: HeaderNavItem[];
  pathname: string;
}

interface OrgNavDropdownItemProps {
  item: HeaderNavItem;
  pathname: string;
}

export function OrgNav({ items, pathname }: OrgNavProps) {
  const activeItem = items.find((item) => item.isActive(pathname)) ?? null;
  const navLinks = items.map((item) => <HeaderNavLink key={item.path} item={item} pathname={pathname} />);
  const dropdownItems = items.map((item) => <OrgNavDropdownItem key={item.path} item={item} pathname={pathname} />);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <nav className="hidden min-w-0 items-center gap-1 md:flex">{navLinks}</nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-0 md:hidden">
            <ListIcon data-icon="inline-start" />
            <span className="max-w-20 truncate">{activeItem?.label ?? 'Org'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {dropdownItems}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const OrgNavDropdownItem = memo(function OrgNavDropdownItem({ item, pathname }: OrgNavDropdownItemProps) {
  const isActive = item.isActive(pathname);

  return (
    <DropdownMenuItem asChild className="h-10 justify-between px-3">
      <Link to={item.path} aria-current={isActive ? 'page' : undefined}>
        <span>{item.label}</span>
        {isActive && <span className="size-1.5 rounded-full bg-foreground" />}
      </Link>
    </DropdownMenuItem>
  );
});
