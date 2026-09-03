import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArchiveIcon } from '@phosphor-icons/react';
import type { EntityTabValue } from '@/components/features/settings-library/types';
import { ArchiveReasonsIcon } from '@/lib/constants/domain-icons';
import type { ArchiveReasonRow } from '@/lib/schemas/archive-reasons';

export type TabValue = EntityTabValue;

export const EMPTY_REASONS: ArchiveReasonRow[] = [];

interface EmptyStateConfig {
  icon: PhosphorIcon;
  title: string;
  description: string;
}

export const EMPTY_STATE_CONFIG: Record<TabValue, EmptyStateConfig> = {
  active: {
    icon: ArchiveReasonsIcon,
    title: 'No reasons yet',
    description: 'Reasons help track why applications get archived.',
  },
  archived: {
    icon: ArchiveIcon,
    title: 'No archived reasons',
    description: 'Archive a reason to hide it from the picker without deleting history.',
  },
};
