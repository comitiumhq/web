import { ArchiveIcon, type LucideIcon } from 'lucide-react';

import { CustomFieldsIcon } from '@/lib/constants/domain-icons';
import type { CustomFieldRow } from '@/lib/schemas/custom-fields';

export type TabValue = 'active' | 'archived';

export const EMPTY_FIELDS: CustomFieldRow[] = [];

interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const EMPTY_STATE_CONFIG: Record<TabValue, EmptyStateConfig> = {
  active: {
    icon: CustomFieldsIcon,
    title: 'No custom fields yet',
    description: 'Custom fields store additional structured data on candidates.',
  },
  archived: {
    icon: ArchiveIcon,
    title: 'No archived fields',
    description: 'Archive a field to hide it from candidate views without losing past values.',
  },
};
