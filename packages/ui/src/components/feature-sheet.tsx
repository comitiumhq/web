import type * as React from 'react';
import { cn } from '../lib/cn';
import { SheetContent, SheetFooter, SheetHeader } from './sheet';

const FEATURE_SHEET_SIZE_CLASSES = {
  compact: 'data-[side=right]:w-full data-[side=right]:sm:max-w-xl',
  form: 'data-[side=right]:w-full data-[side=right]:sm:max-w-2xl',
  editor: 'data-[side=right]:w-full data-[side=right]:sm:max-w-3xl',
  wide: 'data-[side=right]:w-full data-[side=right]:sm:max-w-6xl',
  workspace:
    'data-[side=right]:w-full data-[side=right]:sm:w-[calc(100vw-5rem)] data-[side=right]:sm:max-w-[1800px]',
} as const;

type FeatureSheetSize = keyof typeof FEATURE_SHEET_SIZE_CLASSES;

type FeatureSheetContentProps = Omit<React.ComponentProps<typeof SheetContent>, 'className'> & {
  className?: string;
  size: FeatureSheetSize;
};

function FeatureSheetContent({ className, size, ...props }: FeatureSheetContentProps) {
  return (
    <SheetContent className={cn('flex flex-col gap-0 p-0', FEATURE_SHEET_SIZE_CLASSES[size], className)} {...props} />
  );
}

function FeatureSheetHeader({ className, ...props }: React.ComponentProps<typeof SheetHeader>) {
  return <SheetHeader className={cn('shrink-0 px-6 py-4', className)} {...props} />;
}

function FeatureSheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-y-auto px-6 py-6', className)} {...props} />;
}

type FeatureSheetFooterProps = React.ComponentProps<typeof SheetFooter> & {
  stackOnMobile?: boolean;
};

function FeatureSheetFooter({ className, stackOnMobile = false, ...props }: FeatureSheetFooterProps) {
  const alignmentClassName = stackOnMobile ? 'sm:flex-row sm:justify-end' : 'flex-row justify-end';

  return (
    <SheetFooter
      className={cn('shrink-0 gap-2 px-6 py-4', alignmentClassName, className)}
      {...props}
    />
  );
}

export { FeatureSheetBody, FeatureSheetContent, FeatureSheetFooter, FeatureSheetHeader };
