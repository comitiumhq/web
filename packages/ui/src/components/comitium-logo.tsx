import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { ComitiumMark } from './comitium-mark';

interface ComitiumLogoProps extends ComponentProps<'span'> {
  markClassName?: string;
  textClassName?: string;
}

export function ComitiumLogo({ className, markClassName, textClassName, ...props }: ComitiumLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-foreground', className)} {...props}>
      <ComitiumMark className={cn('h-6 w-auto shrink-0', markClassName)} />
      <span className={cn('text-heading-20 tracking-[-0.03em]', textClassName)}>Comitium</span>
    </span>
  );
}
