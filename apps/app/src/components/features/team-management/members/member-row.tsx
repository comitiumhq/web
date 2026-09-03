import { truncateAddress } from '@comitium/ui/display-name';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { TableCell, TableRow } from '@comitium/ui/table';
import { type KeyboardEvent, type MouseEvent, memo, type ReactNode, useCallback } from 'react';
import type { OrgTeamMember } from '@/hooks/queries/use-query-org-team';
import type { OrgRole } from '@/lib/schemas/org';
import { cn, getMemberDisplayName } from '@/lib/utils';

interface MemberRowProps {
  member: OrgTeamMember;
  onSelect: (userId: string) => void;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  org_admin: 'Organization Admin',
  org_member: 'Member',
};

interface AccessDisplay {
  label: string;
  hasDetails: boolean;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

function stopRowSelection(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function stopRowKeyboardSelection(event: KeyboardEvent<HTMLElement>) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation();
  }
}

function getAccessDisplay(member: OrgTeamMember): AccessDisplay {
  if (!member.isActive) {
    return { label: 'Deactivated', hasDetails: false };
  }

  if (member.role === 'org_admin') {
    return { label: 'Organization-wide', hasDetails: false };
  }

  const departments = member.accessSummary.departmentGrants;
  const jobs = member.accessSummary.directJobAssignments;

  if (departments.length === 0 && jobs.length === 0) {
    return { label: 'No Access', hasDetails: false };
  }

  const scopes: string[] = [];

  if (departments.length > 0) {
    scopes.push(pluralize(departments.length, 'team', 'teams'));
  }

  if (jobs.length > 0) {
    scopes.push(pluralize(jobs.length, 'job', 'jobs'));
  }

  return { label: scopes.join(' · '), hasDetails: true };
}

function getJobTitle(title: string | null): string {
  const trimmedTitle = title?.trim();

  if (trimmedTitle) {
    return trimmedTitle;
  }

  return 'Untitled job';
}

function getSecondaryIdentity(member: OrgTeamMember, displayName: string): { label: string; isAddress: boolean } {
  const email = member.email?.trim();

  if (email && email !== displayName) {
    return { label: email, isAddress: false };
  }

  return { label: truncateAddress(member.walletAddress), isAddress: true };
}

export const MemberRow = memo(function MemberRow({ member, onSelect }: MemberRowProps) {
  const displayName = getMemberDisplayName(member);
  const accessDisplay = getAccessDisplay(member);
  const secondaryIdentity = getSecondaryIdentity(member, displayName);

  const handleSelect = useCallback(() => {
    onSelect(member.userId);
  }, [onSelect, member.userId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      onSelect(member.userId);
    },
    [onSelect, member.userId],
  );

  return (
    <TableRow
      className={cn('cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', {
        'opacity-60': !member.isActive,
      })}
      tabIndex={0}
      aria-label={`Open ${displayName} permissions`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <TableCell>
        <div className="flex items-center gap-2.5">
          <InitialsAvatar identity={member} size="md" />
          <div className="flex min-w-0 flex-col items-start">
            <span className="flex max-w-50 items-center gap-2 text-label-14">
              <span className="min-w-0 truncate">{displayName}</span>
            </span>
            <span
              className={cn('text-label-12 text-muted-foreground max-w-50 truncate', {
                'font-mono': secondaryIdentity.isAddress,
              })}
            >
              {secondaryIdentity.label}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-label-13 text-muted-foreground">{ROLE_LABELS[member.role]}</span>
      </TableCell>
      <TableCell>
        <AccessCell member={member} memberName={displayName} accessDisplay={accessDisplay} />
      </TableCell>
    </TableRow>
  );
});

interface AccessCellProps {
  member: OrgTeamMember;
  memberName: string;
  accessDisplay: AccessDisplay;
}

function AccessCell({ member, memberName, accessDisplay }: AccessCellProps) {
  if (!accessDisplay.hasDetails) {
    return <span className="text-label-13 text-muted-foreground">{accessDisplay.label}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-label-13 max-w-56 truncate rounded-md font-medium text-muted-foreground tabular-nums underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label={`Show access details for ${memberName}`}
            onClick={stopRowSelection}
            onKeyDown={stopRowKeyboardSelection}
          >
            {accessDisplay.label}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-96 max-w-[calc(100vw-2rem)] p-0"
          aria-label={`Access details for ${memberName}`}
          onClick={stopRowSelection}
          onKeyDown={stopRowKeyboardSelection}
        >
          <div className="flex max-h-80 flex-col gap-4 overflow-y-auto p-4">
            {member.accessSummary.departmentGrants.length > 0 && (
              <AccessDetails title="Team access" count={member.accessSummary.departmentGrants.length}>
                {member.accessSummary.departmentGrants.map((grant) => (
                  <AccessDetailRow key={grant.departmentId} name={grant.departmentName} detail={grant.roleName} />
                ))}
              </AccessDetails>
            )}
            {member.accessSummary.directJobAssignments.length > 0 && (
              <AccessDetails title="Job access" count={member.accessSummary.directJobAssignments.length}>
                {member.accessSummary.directJobAssignments.map((grant) => (
                  <AccessDetailRow key={grant.jobId} name={getJobTitle(grant.jobTitle)} detail={grant.roleName} />
                ))}
              </AccessDetails>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface AccessDetailsProps {
  title: string;
  count: number;
  children: ReactNode;
}

function AccessDetails({ title, count, children }: AccessDetailsProps) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  if (!hasChildren) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-label-12 font-medium text-muted-foreground">{title}</h3>
        <span className="text-label-12 font-semibold text-muted-foreground tabular-nums">{count}</span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

interface AccessDetailRowProps {
  name: string;
  detail: string;
}

function AccessDetailRow({ name, detail }: AccessDetailRowProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-2.5">
      <span className="text-label-13 min-w-0 truncate text-popover-foreground">{name}</span>
      <span className="text-label-12 shrink-0 text-muted-foreground">{detail}</span>
    </div>
  );
}
