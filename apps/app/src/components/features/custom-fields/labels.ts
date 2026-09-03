import { type FieldTypeId, fieldTypeRegistry, fieldTypesForObjectType, type ObjectType } from '@comitium/schemas/forms';

import { isCandidateCustomFieldValueTypeSupported } from './candidate-custom-field-value-support';

export const CANDIDATE_FIELD_TYPE_OPTIONS: { id: FieldTypeId; label: string; description: string }[] =
  fieldTypesForObjectType('candidate')
    .filter((def) => isCandidateCustomFieldValueTypeSupported(def.id))
    .map((def) => ({
      id: def.id,
      label: def.meta.label,
      description: def.meta.description,
    }));

export const OBJECT_TYPE_OPTIONS: { id: ObjectType; label: string }[] = [{ id: 'candidate', label: 'Candidate' }];

export function getFieldTypeLabel(id: FieldTypeId): string {
  return fieldTypeRegistry[id]?.meta.label ?? id;
}
