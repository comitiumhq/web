import type { DisplayIdentity } from '@comitium/schemas/common';
import { CompanyAvatar } from '@comitium/ui/company-avatar';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@comitium/ui/dropdown-menu';
import { UserAccountSummary } from '@comitium/ui/user-account-summary';
import { CheckIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';
import type { MyOrg } from '@/lib/schemas/org';
import { getOrgDisplayName } from '@/lib/utils/org';

const switcherLeadingSlotClassName = 'flex size-7 shrink-0 items-center justify-center rounded-md';
const orgSwitchSections = ['/pipeline', '/jobs', '/settings', '/organization', '/interviews'] as const;

interface AccountContextSwitcherProps {
  currentOrgId: string | null;
  identity: DisplayIdentity | null;
  onSelectOrg: (id: string) => void;
  orgs: MyOrg[];
}

interface OrgMenuItemProps {
  org: MyOrg;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function isJobBoardPath(pathname: string): boolean {
  return pathname.startsWith('/jobs') || pathname.startsWith('/careers');
}

export function getOrgContextId(pathname: string, routeOrgId: string | null): string | null {
  if (!pathname.startsWith('/org/')) {
    return null;
  }

  return routeOrgId;
}

export function getOrgSwitchPath(pathname: string, currentOrgId: string | null, nextOrgId: string): string {
  if (!currentOrgId) {
    return `/org/${nextOrgId}`;
  }

  const currentOrgBasePath = `/org/${currentOrgId}`;

  if (!pathname.startsWith(currentOrgBasePath)) {
    return `/org/${nextOrgId}`;
  }

  const subPath = pathname.slice(currentOrgBasePath.length);
  const section = orgSwitchSections.find(function isCurrentOrgSection(candidate) {
    return subPath === candidate || subPath.startsWith(`${candidate}/`);
  });

  if (!section) {
    return `/org/${nextOrgId}`;
  }

  return `/org/${nextOrgId}${section}`;
}

const OrgMenuItem = memo(function OrgMenuItem({ org, selected, onSelect }: OrgMenuItemProps) {
  const displayName = getOrgDisplayName(org);

  const handleSelect = useCallback(() => {
    if (selected) {
      return;
    }

    onSelect(org.id);
  }, [onSelect, org.id, selected]);

  return (
    <DropdownMenuItem
      className="h-10 justify-between gap-3 px-3 text-sm"
      onClick={handleSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <span className={switcherLeadingSlotClassName}>
        <CompanyAvatar name={displayName} logo={org.logo} size="sm" className="size-7 rounded-md" decorative />
      </span>
      <span className="min-w-0 flex-1 truncate text-label-14">{displayName}</span>
      {selected && <CheckIcon className="size-4 text-foreground" />}
    </DropdownMenuItem>
  );
});

export function AccountContextSwitcher({ currentOrgId, identity, onSelectOrg, orgs }: AccountContextSwitcherProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="h-auto px-3 py-2.5">
        <UserAccountSummary identity={identity} />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64">
        <div className="max-h-56 overflow-y-auto">
          {orgs.map(function renderOrgMenuItem(org) {
            return <OrgMenuItem key={org.id} org={org} selected={org.id === currentOrgId} onSelect={onSelectOrg} />;
          })}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
