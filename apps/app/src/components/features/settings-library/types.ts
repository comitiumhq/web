import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

export type EntityTabValue = 'active' | 'archived';

export interface EntityEmptyState {
  icon: PhosphorIcon;
  title: string;
  description: string;
}

export interface ArchivableEntity {
  id: string;
  label: string;
  updatedAt: string;
  isArchived: boolean;
}
