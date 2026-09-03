import type * as React from 'react';
import { cn } from '../lib/cn';
import { SheetContent, SheetFooter, SheetHeader } from './sheet';

const FEATURE_SHEET_WIDTH_CLASSES = {
  md: 'data-[side=right]:sm:max-w-lg',
  lg: 'data-[side=right]:sm:max-w-xl',
  xl: 'data-[side=right]:sm:max-w-2xl',
  '2xl': 'data-[side=right]:sm:max-w-3xl',
  'fixed-640': '!w-full sm:!w-[640px] sm:!max-w-[640px]',
  'full-xl': 'data-[side=right]:w-full data-[side=right]:sm:max-w-xl',
  'full-6xl': 'data-[side=right]:w-full data-[side=right]:sm:max-w-6xl',
} as const;

type FeatureSheetWidth = keyof typeof FEATURE_SHEET_WIDTH_CLASSES;

type FeatureSheetContentProps = Omit<React.ComponentProps<typeof SheetContent>, 'className'> & {
  className?: string;
  width: FeatureSheetWidth;
};

function FeatureSheetContent({ className, width, ...props }: FeatureSheetContentProps) {
  return (
    <SheetContent className={cn('flex flex-col gap-0 p-0', FEATURE_SHEET_WIDTH_CLASSES[width], className)} {...props} />
  );
}

function FeatureSheetHeader({ className, ...props }: React.ComponentProps<typeof SheetHeader>) {
  return <SheetHeader className={cn('shrink-0 border-b border-border px-6 py-4', className)} {...props} />;
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
      className={cn('shrink-0 gap-2 border-t border-border px-6 py-4', alignmentClassName, className)}
      {...props}
    />
  );
}

export { FeatureSheetBody, FeatureSheetContent, FeatureSheetFooter, FeatureSheetHeader };
