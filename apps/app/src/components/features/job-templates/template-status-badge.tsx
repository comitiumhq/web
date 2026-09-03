import { Badge } from '@comitium/ui/badge';
import { memo } from 'react';
import type { JobTemplateStatus } from '@/lib/schemas/job-templates';

type BadgeVariant = 'success' | 'secondary' | 'outline';

const VARIANT: Record<JobTemplateStatus, BadgeVariant> = {
  active: 'success',
  inactive: 'secondary',
  archived: 'outline',
};

const LABEL: Record<JobTemplateStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

interface TemplateStatusBadgeProps {
  status: JobTemplateStatus;
}

export const TemplateStatusBadge = memo(function TemplateStatusBadge({ status }: TemplateStatusBadgeProps) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
});
