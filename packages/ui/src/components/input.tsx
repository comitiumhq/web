import type * as React from 'react';

import { cn } from '../lib/cn';

type InputSize = 'default' | 'lg';

interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  size?: InputSize;
}

const inputSizeClassNames: Record<InputSize, string> = {
  default: 'h-9 px-3 py-1',
  lg: 'h-10 px-4 py-2',
};

function Input({ className, type, size = 'default', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full min-w-0 rounded-4xl border border-input bg-input/30 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        inputSizeClassNames[size],
        className,
      )}
      {...props}
    />
  );
}

export { Input };
