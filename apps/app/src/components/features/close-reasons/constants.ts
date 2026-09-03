import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArchiveIcon } from '@phosphor-icons/react';

import type { EntityTabValue } from '@/components/features/settings-library/types';
import { CloseJobReasonsIcon } from '@/lib/constants/domain-icons';
import type { CloseReasonRow } from '@/lib/schemas/close-reasons';

export type TabValue = EntityTabValue;

export const EMPTY_REASONS: CloseReasonRow[] = [];

interface EmptyStateConfig {
  icon: PhosphorIcon;
  title: string;
  description: string;
}

export const EMPTY_STATE_CONFIG: Record<TabValue, EmptyStateConfig> = {
  active: {
    icon: CloseJobReasonsIcon,
    title: 'No reasons yet',
    description: 'Reasons track why a job posting was closed.',
  },
  archived: {
    icon: ArchiveIcon,
    title: 'No archived reasons',
    description: 'Archive a reason to hide it from the picker without deleting history.',
  },
};
