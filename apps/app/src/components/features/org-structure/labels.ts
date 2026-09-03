import type { OrgLocationType } from '@/lib/schemas/org-structure';

export const LOCATION_TYPE_LABELS: Record<OrgLocationType, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  on_site: 'On-site',
};

export const LOCATION_TYPE_OPTIONS: { value: OrgLocationType; label: string }[] = [
  { value: 'remote', label: LOCATION_TYPE_LABELS.remote },
  { value: 'hybrid', label: LOCATION_TYPE_LABELS.hybrid },
  { value: 'on_site', label: LOCATION_TYPE_LABELS.on_site },
];
