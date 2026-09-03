import { LockIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';

import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import { cn } from '@/lib/utils';

interface EncryptedPlaceholderProps {
  orgId: string;
  variant: 'text' | 'block' | 'inline';
  lines?: number;
  withBorder?: boolean;
  className?: string;
}

export function EncryptedPlaceholder({
  orgId,
  variant,
  lines = 3,
  withBorder = true,
  className,
}: EncryptedPlaceholderProps) {
  const { requestUnlock } = useEncryptionUnlocked(orgId);

  const handleClick = useCallback(() => {
    requestUnlock();
  }, [requestUnlock]);

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Encrypted — click to unlock vault"
        className={cn(
          'inline-flex items-center text-muted-foreground hover:text-foreground transition-colors',
          className,
        )}
      >
        <LockIcon className="size-3" />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Encrypted — click to unlock vault"
        className={cn(
          'inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors',
          className,
        )}
      >
        <LockIcon className="size-3 shrink-0" />
        <span className="inline-block h-4 w-32 rounded-sm bg-muted blur-[2px]" />
      </button>
    );
  }

  const blockClasses = withBorder
    ? 'flex w-full flex-col items-stretch gap-2 rounded-md border border-dashed border-border bg-muted p-4 text-left transition-colors hover:border-ring hover:bg-muted'
    : 'flex w-full flex-col items-stretch gap-2 text-left transition-opacity hover:opacity-80';

  return (
    <button type="button" onClick={handleClick} className={cn(blockClasses, className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <LockIcon className="size-4 shrink-0" />
        <span className="text-label-12">Encrypted — click to unlock vault</span>
      </div>
      <div className="mt-1 flex flex-col gap-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('h-3 rounded-sm bg-muted blur-[2px]', {
              'w-2/3': i === lines - 1,
              'w-full': i !== lines - 1,
            })}
          />
        ))}
      </div>
    </button>
  );
}
