import type { LucideIcon } from 'lucide-react';

export type EntityTabValue = 'active' | 'archived';

export interface EntityEmptyState {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ArchivableEntity {
  id: string;
  label: string;
  updatedAt: string;
  isArchived: boolean;
}
