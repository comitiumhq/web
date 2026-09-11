import { cva, type VariantProps } from 'class-variance-authority';
import { Toggle as TogglePrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '../lib/cn';

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-4xl text-sm font-medium whitespace-nowrap outline-none transition-[color,background-color,border-color,box-shadow] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted aria-pressed:text-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-control-border bg-control bg-clip-padding text-muted-foreground hover:border-control-border-hover hover:bg-control-hover aria-pressed:border-control-border-hover aria-pressed:bg-segment aria-pressed:text-foreground aria-pressed:shadow-[var(--segment-shadow)] aria-pressed:hover:bg-segment',
      },
      size: {
        default: 'h-9 min-w-9 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        sm: 'h-8 min-w-8 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        lg: 'h-10 min-w-10 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Toggle({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
  );
}

export { Toggle, toggleVariants };
