import type { DisplayIdentity } from '@comitium/schemas/common';
import { cn } from '../lib/cn';
import { getMemberDisplayName } from '../lib/display-name';
import { UserAvatar } from './user-avatar';

interface UserAccountSummaryProps {
  identity: DisplayIdentity | null;
  className?: string;
}

export function UserAccountSummary({ identity, className }: UserAccountSummaryProps) {
  const label = getMemberDisplayName(identity ?? {});
  const detail = identity?.name && identity.email ? identity.email : null;

  return (
    <span className={cn('flex min-w-0 flex-1 items-center gap-3', className)}>
      <UserAvatar identity={identity} size="sm" className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-label-14 text-foreground">{label}</span>
        {detail ? <span className="truncate text-label-12 text-muted-foreground">{detail}</span> : null}
      </span>
    </span>
  );
}
