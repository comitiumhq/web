import { type FieldTypeId, type FormClass, fieldTypeRegistry, fieldTypesForFormClass } from '@comitium/schemas/forms';

export interface QuestionTypeOption {
  id: FieldTypeId;
  label: string;
  description: string;
}

export function getQuestionTypeOptions(formClass: FormClass): QuestionTypeOption[] {
  return fieldTypesForFormClass(formClass).map((def) => ({
    id: def.id,
    label: def.meta.label,
    description: def.meta.description,
  }));
}

export function getQuestionTypeLabel(id: FieldTypeId): string {
  return fieldTypeRegistry[id]?.meta.label ?? id;
}
