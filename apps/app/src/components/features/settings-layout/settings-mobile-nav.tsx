import { Button } from '@comitium/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comitium/ui/collapsible';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@comitium/ui/drawer';
import { ScrollArea } from '@comitium/ui/scroll-area';
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

import type { SidebarEntry, SidebarGroup, SidebarItem } from './sidebar-config';
import { activeGroupIds, groupIds } from './sidebar-utils';

interface SettingsMobileNavProps {
  entries: SidebarEntry[];
  pathname: string;
  activeLabel: string | undefined;
}

export function SettingsMobileNav({ entries, pathname, activeLabel }: SettingsMobileNavProps) {
  const [open, setOpen] = useState(false);
  const allGroupIds = useMemo(() => groupIds(entries), [entries]);
  const activeIds = useMemo(() => activeGroupIds(entries, pathname), [entries, pathname]);
  const [openValue, setOpenValue] = useState<string[]>([]);
  const initializedRef = useRef(false);

  const handleGroupOpenChange = useCallback((groupId: string, nextOpen: boolean) => {
    setOpenValue((prev) => {
      if (nextOpen) {
        return prev.includes(groupId) ? prev : [...prev, groupId];
      }

      return prev.filter((id) => id !== groupId);
    });
  }, []);

  useEffect(() => {
    if (!initializedRef.current && allGroupIds.length > 0) {
      setOpenValue(allGroupIds);
      initializedRef.current = true;

      return;
    }

    if (activeIds.length === 0) {
      return;
    }

    setOpenValue((prev) => {
      if (activeIds.every((id) => prev.includes(id))) {
        return prev;
      }

      return Array.from(new Set([...prev, ...activeIds]));
    });
  }, [allGroupIds, activeIds]);

  return (
    <div className="lg:hidden mb-6">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-full gap-2">
            {activeLabel ?? 'Settings'}
            <CaretDownIcon data-icon="inline-end" className={cn('transition-transform', { 'rotate-180': open })} />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Settings</DrawerTitle>
            <DrawerDescription className="sr-only">Settings navigation</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="h-[70vh]">
            <nav className="flex flex-col gap-1 px-4 pb-8">
              {entries.map((entry) => {
                if (entry.type === 'item') {
                  return <MobileLink key={entry.path} item={entry} active={entry.match(pathname)} />;
                }

                return (
                  <MobileGroup
                    key={entry.id}
                    group={entry}
                    pathname={pathname}
                    open={openValue.includes(entry.id)}
                    onOpenChange={handleGroupOpenChange}
                  />
                );
              })}
            </nav>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

interface MobileGroupProps {
  group: SidebarGroup;
  pathname: string;
  open: boolean;
  onOpenChange: (groupId: string, open: boolean) => void;
}

function MobileGroup({ group, pathname, open, onOpenChange }: MobileGroupProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(group.id, nextOpen);
    },
    [group.id, onOpenChange],
  );

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger className="group flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-label-14 font-medium text-card-foreground/70 transition-colors hover:bg-accent hover:text-card-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <CaretRightIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 flex flex-col gap-1 pb-4">
          {group.items.map((item) => (
            <MobileLink key={item.path} item={item} active={item.match(pathname)} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface MobileLinkProps {
  item: SidebarItem;
  active: boolean;
}

function MobileLink({ item, active }: MobileLinkProps) {
  const Icon = item.icon;

  return (
    <DrawerClose asChild>
      <Link
        to={item.path}
        className={cn(
          'flex h-10 min-w-0 items-center gap-3 rounded-xl px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          {
            'bg-accent text-accent-foreground': active,
            'hover:bg-accent hover:text-accent-foreground': !active,
          },
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 truncate text-label-14">{item.label}</span>
      </Link>
    </DrawerClose>
  );
}
