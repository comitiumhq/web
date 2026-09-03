import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comitium/ui/collapsible';
import { CaretRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

import type { SidebarEntry, SidebarGroup, SidebarItem } from './sidebar-config';
import { activeGroupIds, groupIds } from './sidebar-utils';

interface SettingsSidebarProps {
  entries: SidebarEntry[];
  pathname: string;
}

export function SettingsSidebar({ entries, pathname }: SettingsSidebarProps) {
  const allGroupIds = useMemo(() => groupIds(entries), [entries]);
  const activeIds = useMemo(() => activeGroupIds(entries, pathname), [entries, pathname]);
  const [openValue, setOpenValue] = useState<string[]>([]);
  const initializedRef = useRef(false);

  const handleGroupOpenChange = useCallback((groupId: string, open: boolean) => {
    setOpenValue((prev) => {
      if (open) {
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
    <aside className="hidden h-full w-72 shrink-0 py-6 lg:block">
      <nav className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 ring-inset">
        {entries.map((entry) => {
          if (entry.type === 'item') {
            return <DesktopLink key={entry.path} item={entry} active={entry.match(pathname)} />;
          }

          return (
            <DesktopGroup
              key={entry.id}
              group={entry}
              pathname={pathname}
              open={openValue.includes(entry.id)}
              onOpenChange={handleGroupOpenChange}
            />
          );
        })}
      </nav>
    </aside>
  );
}

interface DesktopGroupProps {
  group: SidebarGroup;
  pathname: string;
  open: boolean;
  onOpenChange: (groupId: string, open: boolean) => void;
}

function DesktopGroup({ group, pathname, open, onOpenChange }: DesktopGroupProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(group.id, nextOpen);
    },
    [group.id, onOpenChange],
  );

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger className="group flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-label-14 font-medium text-card-foreground/70 transition-colors hover:bg-accent hover:text-card-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <CaretRightIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 flex flex-col gap-1 pb-2">
          {group.items.map((item) => (
            <DesktopLink key={item.path} item={item} active={item.match(pathname)} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface DesktopLinkProps {
  item: SidebarItem;
  active: boolean;
}

function DesktopLink({ item, active }: DesktopLinkProps) {
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
