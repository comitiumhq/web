import { Card, CardHeader } from '@comitium/ui/card';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function HomeCard({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card size="sm" className={cn('min-h-0 min-w-0 gap-0', className)} {...props} />;
}

export function HomeCardHeader({ className, ...props }: ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn('shrink-0 px-7 pb-2', className)} {...props} />;
}
