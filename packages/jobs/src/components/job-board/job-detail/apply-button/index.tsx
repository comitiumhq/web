import { Button } from '@comitium/ui/button';
import { cn } from '@comitium/ui/cn';
import { ChevronRightIcon } from 'lucide-react';

interface ApplyButtonProps {
  applyUrl: string;
  size?: 'sm' | 'default' | 'lg';
  fullWidth?: boolean;
}

export function ApplyButton({ applyUrl, size = 'sm', fullWidth = false }: ApplyButtonProps) {
  return (
    <Button size={size} className={cn({ 'w-full 2xl:max-w-md 2xl:mx-auto': fullWidth })} asChild>
      <a href={applyUrl}>
        Apply
        <ChevronRightIcon data-icon="inline-end" />
      </a>
    </Button>
  );
}
