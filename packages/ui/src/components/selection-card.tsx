import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '../lib/cn';

const selectionCardVariants = cva(
  'group/selection-card rounded-2xl border border-control-border bg-control bg-clip-padding transition-[background-color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none',
  {
    variants: {
      selected: {
        false: 'hover:border-control-border-hover hover:bg-control-hover',
        true: 'border-primary bg-control shadow-[0_0_0_1px_var(--primary)] hover:bg-control',
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

function SelectionCardIndicator({
  selected,
  className,
  ...props
}: React.ComponentProps<'span'> & Pick<VariantProps<typeof selectionCardVariants>, 'selected'>) {
  return (
    <span
      data-selected={selected || undefined}
      className={cn(
        'pointer-events-none relative flex size-5 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-150 ease-out motion-reduce:transition-none',
        selected
          ? 'border-primary bg-primary'
          : 'border-transparent bg-foreground/8 group-hover/selection-card:bg-foreground/14',
        className,
      )}
      aria-hidden="true"
      {...props}
    >
      <span
        className={cn(
          'size-2 rounded-full bg-primary-foreground transition-transform duration-150 ease-out motion-reduce:transition-none',
          selected ? 'scale-100' : 'scale-0',
        )}
      />
    </span>
  );
}

export { SelectionCardIndicator, selectionCardVariants };
