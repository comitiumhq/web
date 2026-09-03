import { EXPLORER_TX_URL } from '@comitium/chain/network';
import { Button } from '@comitium/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { CopyIcon, CubeIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { toast } from 'sonner';

interface JobActionsProps {
  jobUrl: string;
  txHash: string | null;
}

export function JobActions({ jobUrl, txHash }: JobActionsProps) {
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${jobUrl}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  }, [jobUrl]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-foreground/80 hover:bg-muted hover:text-foreground"
          aria-label="Open job actions"
        >
          <DotsThreeVerticalIcon weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onSelect={handleShare}>
          <CopyIcon />
          Copy posting link
        </DropdownMenuItem>
        {txHash && (
          <DropdownMenuItem asChild>
            <a href={`${EXPLORER_TX_URL}${txHash}`} target="_blank" rel="noopener noreferrer">
              <CubeIcon />
              View in explorer
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
