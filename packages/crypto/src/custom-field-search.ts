import { z } from 'zod';

const SEARCHABLE_FIELD_TYPES = ['yes_no', 'multiple_choice', 'location'] as const;
const locationHashValueSchema = z.object({ cityId: z.number() });

export type SearchableCustomFieldType = (typeof SEARCHABLE_FIELD_TYPES)[number];

const searchableFieldTypes = new Set<string>(SEARCHABLE_FIELD_TYPES);

export function isSearchableCustomFieldType(fieldType: string): fieldType is SearchableCustomFieldType {
  return searchableFieldTypes.has(fieldType);
}

export function normalizeCustomFieldValue(value: unknown, fieldType: SearchableCustomFieldType): string {
  switch (fieldType) {
    case 'multiple_choice':
    case 'yes_no':
      return String(value).trim().toLowerCase();
    case 'location': {
      const location = locationHashValueSchema.safeParse(value);

      return location.success ? String(location.data.cityId) : '';
    }
  }
}
