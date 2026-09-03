import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArchiveIcon } from '@phosphor-icons/react';
import { CancelRescheduleReasonsIcon } from '@/lib/constants/domain-icons';
import type { ReasonAppliesTo, ReasonCategory, ReasonRow } from '@/lib/schemas/cancel-reschedule-reasons';

export type TabValue = 'active' | 'archived';
export type PolicyAction = 'cancel' | 'reschedule';

export const CATEGORY_ORDER: ReasonCategory[] = ['candidate', 'interviewer', 'company'];
export const APPLIES_TO_OPTIONS: ReasonAppliesTo[] = ['both', 'cancel', 'reschedule'];

export const EMPTY_REASONS: ReasonRow[] = [];
export const NOTE_MAX_LENGTH = 1000;

interface EmptyStateConfig {
  icon: PhosphorIcon;
  title: string;
  description: string;
}

export const EMPTY_STATE_CONFIG: Record<TabValue, EmptyStateConfig> = {
  active: {
    icon: CancelRescheduleReasonsIcon,
    title: 'No reasons yet',
    description: 'Create reusable reasons for canceled or rescheduled interviews.',
  },
  archived: {
    icon: ArchiveIcon,
    title: 'No archived reasons',
    description: 'Archive a reason to hide it from the picker without deleting history.',
  },
};
