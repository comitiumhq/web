import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { getMemberDisplayName, type MemberDisplayIdentity } from '@comitium/ui/display-name';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { memo } from 'react';

interface PendingReviewerRowProps {
  identity: MemberDisplayIdentity;
  isMe: boolean;
  canSubmit: boolean;
  onSubmit: (() => void) | null;
}

export const PendingReviewerRow = memo(function PendingReviewerRow({
  identity,
  isMe,
  canSubmit,
  onSubmit,
}: PendingReviewerRowProps) {
  const showSubmit = canSubmit && onSubmit !== null;
  const needsAccess = isMe && !canSubmit;
  const badgeLabel = needsAccess ? 'Access needed' : 'Pending';
  const badgeVariant = needsAccess ? 'warning' : 'secondary';

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <InitialsAvatar identity={identity} size="sm" className="shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <p className="text-label-13 font-medium truncate text-muted-foreground">{getMemberDisplayName(identity)}</p>
        <p className="text-label-12 text-muted-foreground">Feedback not submitted yet</p>
      </div>
      {showSubmit ? (
        <Button type="button" variant="outline" size="xs" onClick={onSubmit}>
          Submit feedback
        </Button>
      ) : (
        <Badge variant={badgeVariant} className="shrink-0">
          {badgeLabel}
        </Badge>
      )}
    </div>
  );
});
