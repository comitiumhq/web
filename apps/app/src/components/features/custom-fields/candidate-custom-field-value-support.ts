import type { FieldTypeId } from '@comitium/schemas/forms';

const SUPPORTED_CANDIDATE_CUSTOM_FIELD_VALUE_TYPES: ReadonlySet<FieldTypeId> = new Set([
  'short_answer',
  'long_unformatted',
  'phone',
  'url',
  'email',
  'multiple_choice',
  'checkboxes',
  'yes_no',
  'date',
  'number',
  'location',
  'employee',
]);

export function isCandidateCustomFieldValueTypeSupported(fieldType: FieldTypeId): boolean {
  return SUPPORTED_CANDIDATE_CUSTOM_FIELD_VALUE_TYPES.has(fieldType);
}
