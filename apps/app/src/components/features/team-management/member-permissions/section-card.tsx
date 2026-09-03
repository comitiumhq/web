import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  headerClassName?: string;
  actionClassName?: string;
  contentClassName?: string;
  children?: ReactNode;
}

export function SectionCard({
  title,
  description,
  action,
  headerClassName,
  actionClassName,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card size="sm" className="gap-0">
      <CardHeader className={headerClassName}>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription className="text-copy-13 leading-relaxed">{description}</CardDescription>}
        {action && <CardAction className={actionClassName}>{action}</CardAction>}
      </CardHeader>
      {children && <CardContent className={contentClassName}>{children}</CardContent>}
    </Card>
  );
}
