import { Badge } from '@comitium/ui/badge';
import { XIcon } from '@phosphor-icons/react';
import { type MouseEvent, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TagChipProps {
  label: string;
  tagId?: string;
  onRemove?: (tagId: string) => void;
  className?: string;
}

export const TagChip = memo(function TagChip({ label, tagId, onRemove, className }: TagChipProps) {
  const removable = !!(onRemove && tagId);

  const handleRemoveClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (onRemove && tagId) {
        onRemove(tagId);
      }
    },
    [onRemove, tagId],
  );

  return (
    <Badge variant="secondary" className={cn('gap-1 pr-1.5', { 'pr-2': !removable }, className)}>
      <span className="truncate">{label}</span>

      {removable && (
        <button
          type="button"
          onClick={handleRemoveClick}
          className="rounded-full opacity-60 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
          aria-label={`Remove tag ${label}`}
        >
          <XIcon className="size-3" />
        </button>
      )}
    </Badge>
  );
});
