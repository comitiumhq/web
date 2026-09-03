import { Button } from '@comitium/ui/button';
import type { MemberDisplayIdentity } from '@comitium/ui/display-name';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { XIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';

interface ResourceColumnProps {
  userId: string;
  identity: MemberDisplayIdentity;
  timeZone: string | null;
  title: string;
  onRemove?: (userId: string) => void;
}

export const ResourceColumn = memo(function ResourceColumn({
  userId,
  identity,
  timeZone,
  title,
  onRemove,
}: ResourceColumnProps) {
  const handleRemoveClick = useCallback(() => onRemove?.(userId), [userId, onRemove]);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 min-w-0 w-full">
      <InitialsAvatar identity={identity} size="md" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-label-13 font-medium truncate">{title}</span>
        {timeZone && <span className="text-label-12 text-muted-foreground truncate">{timeZone}</span>}
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={handleRemoveClick}
          aria-label={`Remove ${title}`}
        >
          <XIcon className="text-muted-foreground" />
        </Button>
      )}
    </div>
  );
});
