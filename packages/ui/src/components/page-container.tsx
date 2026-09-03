import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '../lib/cn';

const pageContainerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-8', {
  variants: {
    size: {
      workspace: 'max-w-[1440px]',
      settings: 'max-w-6xl',
      content: 'max-w-5xl',
      list: 'max-w-4xl',
      editor: 'max-w-4xl',
      narrow: 'max-w-2xl',
    },
  },
  defaultVariants: {
    size: 'workspace',
  },
});

type PageContainerProps = React.ComponentProps<'div'> &
  VariantProps<typeof pageContainerVariants> & {
    as?: 'div' | 'main' | 'section';
  };

function PageContainer({ as: Component = 'div', className, size, ...props }: PageContainerProps) {
  return <Component data-slot="page-container" className={cn(pageContainerVariants({ size }), className)} {...props} />;
}

export { PageContainer };
