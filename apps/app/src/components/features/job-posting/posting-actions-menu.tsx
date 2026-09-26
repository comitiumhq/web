import { Button } from '@comitium/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { CopyIcon, DotsThreeVerticalIcon, EyeSlashIcon } from '@phosphor-icons/react';

interface PostingActionsMenuProps {
  canAddCommitment: boolean;
  canCopyLink: boolean;
  canUnpublish: boolean;
  onAddCommitment: () => void;
  onCopyLink: () => void;
  onUnpublish: () => void;
}

export function PostingActionsMenu({
  canAddCommitment,
  canCopyLink,
  canUnpublish,
  onAddCommitment,
  onCopyLink,
  onUnpublish,
}: PostingActionsMenuProps) {
  if (!canAddCommitment && !canCopyLink && !canUnpublish) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 shrink-0">
          <DotsThreeVerticalIcon />
          <span className="sr-only">Posting actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canCopyLink && (
          <DropdownMenuItem onSelect={onCopyLink}>
            <CopyIcon />
            Copy link
          </DropdownMenuItem>
        )}
        {canAddCommitment && <DropdownMenuItem onSelect={onAddCommitment}>Add commitment</DropdownMenuItem>}
        {canUnpublish && (canCopyLink || canAddCommitment) && <DropdownMenuSeparator />}
        {canUnpublish && (
          <DropdownMenuItem variant="destructive" onSelect={onUnpublish}>
            <EyeSlashIcon />
            Unpublish
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
